// services/promocion.service.js
const mongoose = require('mongoose');
const AnioLectivo = require('../models/AnioLectivo');
const Curso = require('../models/Curso');
const Matricula = require('../models/Matricula');
const Calificacion = require('../models/Calificacion');
const Asistencia = require('../models/Asistencia');

/**
 * REGLAS (puedes mover a .env)
 */
const PROM_MIN_FINAL = Number(process.env.PROM_MIN_FINAL ?? 7.0);
const PROM_REDONDEO_DEC = Number(process.env.PROM_REDONDEO_DEC ?? 1);
const PROM_REQUIERE_T123 = String(process.env.PROM_REQUIERE_T123 ?? 'true') === 'true';
const ASIS_MAX_INASISTENCIA_PCT = Number(process.env.ASIS_MAX_INASISTENCIA_PCT ?? 25);
const PROM_USA_MATERIAS_REPROBADAS = String(process.env.PROM_USA_MATERIAS_REPROBADAS ?? 'false') === 'true';

/**
 * Calcula si el estudiante aprueba el año lectivo.
 * - Calificaciones: tu colección guarda 1 documento POR TRIMESTRE.
 *   Promedio por materia = promedio de trimestres presentes (T1/T2/T3) de esa materia.
 *   Promedio anual = promedio de promedios por materia.
 * - Asistencias: suma faltas y días laborados desde T1/T2/T3 de cada Asistencia.
 */
async function evaluarAprobacionAnual(estudianteId, anioLectivoId) {
  const motivos = [];
  let promedioFinal = null;
  let inasistenciaPct = null;
  let materiasReprobadas = 0;

  // ===== Calificaciones (por trimestre) -> agrupar por materia
  const califs = await Calificacion.find({
    estudianteId,
    anioLectivoId,
  }).lean();

  if (califs.length) {
    // Map materiaId -> array de promedios por trimestre
    const byMateria = new Map();
    for (const c of califs) {
      const materia = String(c.materiaId);
      const nota = numOrNull(c.promedioTrimestral);
      if (nota == null) continue;
      if (!byMateria.has(materia)) byMateria.set(materia, []);
      byMateria.get(materia).push(nota);
    }

    const finales = [];
    for (const [materia, notas] of byMateria.entries()) {
      if (PROM_REQUIERE_T123 && notas.length < 3) {
        motivos.push(`Materia ${materia}: faltan trimestres.`);
        continue;
      }
      if (!notas.length) continue;

      const promMateria = roundN(notas.reduce((a, b) => a + b, 0) / notas.length, PROM_REDONDEO_DEC);
      finales.push(promMateria);

      if (PROM_USA_MATERIAS_REPROBADAS && promMateria < PROM_MIN_FINAL) {
        materiasReprobadas += 1;
      }
    }

    if (finales.length) {
      promedioFinal = roundN(finales.reduce((a, b) => a + b, 0) / finales.length, PROM_REDONDEO_DEC);
    }
  }

  // ===== Asistencias: suma T1/T2/T3 -> faltas y diasLaborados
  // El esquema define un doc por {anioLectivo, curso, materia, estudiante} con subdocs T1,T2,T3
  const asisList = await Asistencia.find({
    estudiante: estudianteId,
    anioLectivo: anioLectivoId,
  }).lean();

  if (asisList.length) {
    let faltas = 0;
    let diasLab = 0;

    for (const a of asisList) {
      for (const key of ['T1', 'T2', 'T3']) {
        const t = a[key];
        if (!t) continue;
        faltas += Number(t.faltasJustificadas || 0) + Number(t.faltasInjustificadas || 0);
        diasLab += Number(t.diasLaborados || 0);
      }
    }

    if (diasLab > 0) {
      inasistenciaPct = roundN((faltas / diasLab) * 100, 1);
    }
  }

  // ===== Decisión
  let aprobado = true;

  if (promedioFinal == null || Number.isNaN(promedioFinal)) {
    aprobado = false; motivos.push('No se pudo calcular el promedio anual.');
  } else if (promedioFinal < PROM_MIN_FINAL) {
    aprobado = false; motivos.push(`Promedio final ${promedioFinal} < mínimo ${PROM_MIN_FINAL}.`);
  }

  if (inasistenciaPct != null && inasistenciaPct > ASIS_MAX_INASISTENCIA_PCT) {
    aprobado = false; motivos.push(`% inasistencia ${inasistenciaPct}% > máximo ${ASIS_MAX_INASISTENCIA_PCT}%.`);
  }

  if (PROM_USA_MATERIAS_REPROBADAS && materiasReprobadas > 0) {
    aprobado = false; motivos.push(`Materias reprobadas: ${materiasReprobadas}.`);
  }

  return { aprobado, promedioFinal, inasistenciaPct, materiasReprobadas, motivos };
}

/**
 * Promueve a siguiente año y crea matrícula (idempotente).
 */
async function matricularSiguienteAnio(estudianteId, anioLectivoActualId, cursoActualId) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      // 1) Evaluar
      const ev = await evaluarAprobacionAnual(estudianteId, anioLectivoActualId);
      if (!ev.aprobado) {
        return { ok: false, reason: 'NO_APROBADO', message: ev.motivos?.join(' ') || 'No aprueba' };
      }

      // 2) Año siguiente
      const actual = await AnioLectivo.findById(anioLectivoActualId).session(session);
      if (!actual) throw new Error('Año lectivo actual no existe');

      // Resolver por orden ascendente (si no manejas orden, puedes resolver por fechaInicio)
      const siguiente = await AnioLectivo
        .findOne({ activo: true, orden: { $gt: (actual.orden ?? 0) } })
        .sort({ orden: 1 })
        .session(session);

      if (!siguiente) {
        return { ok: false, reason: 'SIN_ANIO_SIGUIENTE', message: 'No se encontró año lectivo siguiente.' };
      }

      // 3) Curso destino
      const cursoActual = await Curso.findById(cursoActualId).session(session);
      if (!cursoActual) throw new Error('Curso actual no existe');

      let cursoDestinoId = cursoActual.nextCursoId;
      if (!cursoDestinoId) {
        // Fallback por orden: busca curso en año siguiente con orden inmediatamente mayor
        const cursoSiguiente = await Curso.findOne({
          anioLectivo: siguiente._id,
          orden: { $gt: (cursoActual.orden ?? 0) }
        }).sort({ orden: 1 }).session(session);

        if (!cursoSiguiente) {
          return { ok: false, reason: 'SIN_CURSO_DESTINO', message: 'No se encontró curso destino en el nuevo año.' };
        }
        cursoDestinoId = cursoSiguiente._id;
      }

      // 4) Crear matrícula (idempotente por índice único)
      try {
        const mat = await Matricula.create([{
          estudiante: estudianteId,
          anioLectivo: siguiente._id,
          curso: cursoDestinoId,
          estado: 'activa'
        }], { session });

        return {
          ok: true,
          message: 'Promovido y matriculado en el nuevo año lectivo.',
          matriculaId: mat[0]._id,
          anioLectivoNuevoId: siguiente._id,
          cursoNuevoId: cursoDestinoId
        };
      } catch (err) {
        // E11000 = Duplicate key
        if (err && err.code === 11000) {
          return { ok: true, already: true, message: 'Ya estaba matriculado en el nuevo año (idempotente).' };
        }
        throw err;
      }
    });
  } finally {
    session.endSession();
  }
}

/* ===== Utils ===== */
function numOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function roundN(n, d = 1) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

module.exports = {
  evaluarAprobacionAnual,
  matricularSiguienteAnio,
};
