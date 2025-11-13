// controllers/controladorPromocion.js
const mongoose = require('mongoose');
const Curso = require('../models/Curso');
const Estudiante = require('../models/Estudiante');
const AnioLectivo = require('../models/AnioLectivo');
const Promocion = require('../models/Promocion');
const Calificacion = require('../models/Calificacion'); // ajusta si tu archivo se llama distinto
const Asistencia = require('../models/Asistencia');     // igual aquí

// 🔹 Helper: promedio final anual 0..10
async function calcularPromedioFinalAnual(estudianteId, cursoId, anioLectivoId) {
  // EJEMPLO basado en estructura típica:
  // Calificaciones por materia y trimestre con campo "promedioTrimestral"
  const rows = await Calificacion.find({
    curso: cursoId,
    anioLectivo: anioLectivoId,
    estudiante: estudianteId,
  }).lean();

  if (!rows.length) return 0;

  // agrupamos por materia y trimestre
  const matriz = new Map(); // key: materiaId -> { T1,T2,T3 }
  for (const r of rows) {
    const key = String(r.materia);
    if (!matriz.has(key)) matriz.set(key, { T1: null, T2: null, T3: null });
    const obj = matriz.get(key);
    if (r.trimestre && ['T1', 'T2', 'T3'].includes(r.trimestre)) {
      obj[r.trimestre] = typeof r.promedioTrimestral === 'number'
        ? r.promedioTrimestral
        : Number(r.promedioTrimestral || 0);
    }
  }

  // promedio por materia
  const promsMaterias = [];
  for (const [, tri] of matriz.entries()) {
    const vals = [tri.T1, tri.T2, tri.T3]
      .filter((v) => typeof v === 'number' && !Number.isNaN(v));
    if (!vals.length) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    promsMaterias.push(avg);
  }

  if (!promsMaterias.length) return 0;
  const promFinal = promsMaterias.reduce((a, b) => a + b, 0) / promsMaterias.length;
  return Math.round(promFinal * 100) / 100; // 2 decimales
}

// 🔹 Helper: porcentaje de asistencia 0..1
async function calcularAsistenciaAnual(estudianteId, cursoId, anioLectivoId) {
  // Esperamos documentos tipo:
  // { curso, anioLectivo, estudiante, trimestre, faltasJustificadas, faltasInjustificadas, diasLaborables }
  const rows = await Asistencia.find({
    curso: cursoId,
    anioLectivo: anioLectivoId,
    estudiante: estudianteId,
  }).lean();

  if (!rows.length) return 0;

  let totalLaborables = 0;
  let totalInjustificadas = 0;

  for (const r of rows) {
    const dl = Number(r.diasLaborables || 0);
    const fi = Number(r.faltasInjustificadas || 0);
    totalLaborables += dl;
    totalInjustificadas += fi;
  }

  if (!totalLaborables) return 0;
  const asistidos = Math.max(0, totalLaborables - totalInjustificadas);
  const pct = asistidos / totalLaborables; // 0..1
  return pct;
}

// ======================= PROMOCIONAR =======================
exports.promocionar = async (req, res) => {
  try {
    const { anioLectivoId } = req.body;
    if (!anioLectivoId || !mongoose.Types.ObjectId.isValid(anioLectivoId)) {
      return res.status(400).json({ ok: false, message: 'anioLectivoId inválido' });
    }

    const actual = await AnioLectivo.findById(anioLectivoId);
    if (!actual) {
      return res.status(404).json({ ok: false, message: 'Año lectivo no encontrado' });
    }

    // Siguiente año lectivo (por orden)
    const siguiente = await AnioLectivo.findOne({ orden: actual.orden + 1 });
    if (!siguiente) {
      return res.status(400).json({
        ok: false,
        message: 'No existe el siguiente año lectivo configurado (orden siguiente no encontrado)',
      });
    }

    // Cursos del año actual
    const cursos = await Curso.find({ anioLectivo: actual._id });

    const createdIds = [];

    for (const curso of cursos) {
      // buscar curso "superior" en el siguiente año: mismo nivel, orden+1
      const siguienteCurso = await Curso.findOne({
        orden: curso.orden + 1,
        anioLectivo: siguiente._id,
      });

      if (!siguienteCurso) {
        console.warn(
          `[Promoción] No se encontró curso superior para "${curso.nombre}" en año ${siguiente.nombre}`
        );
        continue;
      }

      for (const estId of curso.estudiantes) {
        const promedioFinal = await calcularPromedioFinalAnual(
          estId,
          curso._id,
          actual._id
        );
        const asistencia = await calcularAsistenciaAnual(
          estId,
          curso._id,
          actual._id
        );

        // Regla de aprobación
        // 🔹 >=7 promedio AND >=80% asistencia
        const aprobado = promedioFinal >= 7 && asistencia >= 0.8;

        // Registrar promoción
        const promo = await Promocion.create({
          estudiante: estId,
          cursoAnterior: curso._id,
          cursoNuevo: siguienteCurso._id,
          anioLectivoAnterior: actual._id,
          anioLectivoNuevo: siguiente._id,
          promedioFinal,
          asistencia,
          aprobado,
        });
        createdIds.push(promo._id);

        // Si aprueba → mover a curso superior y año nuevo
        if (aprobado) {
          await Estudiante.findByIdAndUpdate(estId, {
            curso: siguienteCurso._id,
            anioLectivo: siguiente._id,
          });
        }
      }
    }

    // Traer promociones recién creadas, pobladas, para el frontend
    const data = await Promocion.find({ _id: { $in: createdIds } })
      .populate('estudiante', 'nombre cedula')
      .populate('cursoAnterior', 'nombre')
      .populate('cursoNuevo', 'nombre')
      .populate('anioLectivoAnterior', 'nombre')
      .populate('anioLectivoNuevo', 'nombre')
      .lean();

    res.json({ ok: true, data });
  } catch (err) {
    console.error('[Promoción] Error:', err);
    res.status(500).json({ ok: false, message: 'Error al procesar promoción automática' });
  }
};

// (Opcional) listar promociones por año lectivo anterior
exports.listarPorAnio = async (req, res) => {
  try {
    const { anioLectivoId } = req.query;
    const filter = {};
    if (anioLectivoId && mongoose.Types.ObjectId.isValid(anioLectivoId)) {
      filter.anioLectivoAnterior = anioLectivoId;
    }
    const data = await Promocion.find(filter)
      .populate('estudiante', 'nombre cedula')
      .populate('cursoAnterior', 'nombre')
      .populate('cursoNuevo', 'nombre')
      .populate('anioLectivoAnterior', 'nombre')
      .populate('anioLectivoNuevo', 'nombre')
      .lean();

    res.json({ ok: true, data });
  } catch (err) {
    console.error('[Promoción] listarPorAnio error:', err);
    res.status(500).json({ ok: false, message: 'Error al listar promociones' });
  }
};
