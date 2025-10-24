// controllers/controladorCalificacion.js
const mongoose = require('mongoose');
const Calificacion = require('../models/Calificacion');
const Curso = require('../models/Curso'); // ← necesario para validar asignación de profesor
const ErrorResponse = require('../utils/errorResponse');

const isOid = (s) => typeof s === 'string' && mongoose.isValidObjectId(s);
const isTri = (t) => ['T1','T2','T3'].includes(String(t || '').toUpperCase());
const clamp01 = (n, min=0, max=10) => {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return 0;
  return Math.max(min, Math.min(max, v));
};

/** ─────────────────────────────────────────────────────────────
 * Permisos: si el usuario es profesor, debe estar asignado a la materia en ese curso
 * Admin pasa directo.
 * ───────────────────────────────────────────────────────────── */
async function assertProfesorAsignado(reqUser, cursoId, materiaId) {
  if (reqUser?.rol !== 'profesor') return;
  const exists = await Curso.exists({
    _id: cursoId,
    materias: { $elemMatch: { materia: materiaId, profesor: reqUser.id } }
  });
  if (!exists) {
    throw new ErrorResponse('No autorizado: materia no asignada en este curso', 403);
  }
}

/** ─────────────────────────────────────────────────────────────
 * GET /api/calificaciones?cursoId=&anioLectivoId=&materiaId=&trimestre=T1|T2|T3
 * Lista calificaciones. Si viene 'trimestre', retorna solo ese bloque + claves base.
 * ───────────────────────────────────────────────────────────── */
exports.listarPorCursoMateriaTrimestre = async (req, res, next) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre } = req.query;

    if (!isOid(cursoId))       return next(new ErrorResponse('cursoId inválido', 400));
    if (!isOid(anioLectivoId)) return next(new ErrorResponse('anioLectivoId inválido', 400));
    if (!isOid(materiaId))     return next(new ErrorResponse('materiaId inválido', 400));
    if (trimestre && !isTri(trimestre)) {
      return next(new ErrorResponse('trimestre debe ser T1|T2|T3', 400));
    }

    // Permiso por asignación (si es profesor)
    await assertProfesorAsignado(req.user, cursoId, materiaId);

    const docs = await Calificacion.find({
      curso: cursoId,
      anioLectivo: anioLectivoId,
      materia: materiaId,
    })
      .select({
        estudiante: 1, curso: 1, materia: 1, anioLectivo: 1,
        T1:1, T2:1, T3:1, promedioTrimestralAnual:1, evaluacionFinal:1, notaPromocion:1,
        cualitativaFinal:1, observacionFinal:1
      })
      .populate({ path: 'estudiante', select: 'nombre cedula email uid' })
      .lean();

    if (trimestre) {
      const tri = String(trimestre).toUpperCase();
      const data = docs.map(d => ({
        _id: d._id,
        estudiante: d.estudiante,
        curso: d.curso,
        materia: d.materia,
        anioLectivo: d.anioLectivo,
        [tri]: d[tri] || null
      }));
      return res.json({ ok: true, data, trimestre: tri });
    }

    return res.json({ ok: true, data: docs });
  } catch (err) { next(err); }
};

exports.cargarTrimestreBulk = async (req, res, next) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre, notas } = req.body;

    if (!isOid(cursoId))       return next(new ErrorResponse('cursoId inválido', 400));
    if (!isOid(anioLectivoId)) return next(new ErrorResponse('anioLectivoId inválido o faltante', 400));
    if (!isOid(materiaId))     return next(new ErrorResponse('materiaId inválido', 400));
    if (!isTri(trimestre))     return next(new ErrorResponse('trimestre debe ser T1|T2|T3', 400));
    if (!Array.isArray(notas) || !notas.length) {
      return next(new ErrorResponse('notas debe ser un array con al menos 1 elemento', 400));
    }

    // Permisos (profesor asignado)
    await assertProfesorAsignado(req.user, cursoId, materiaId);

    const tri = String(trimestre).toUpperCase();
    const results = { ok: true, updated: 0, errors: 0, rows: [] };

    for (let idx = 0; idx < notas.length; idx++) {
      const n = notas[idx];
      const estudianteId = n?.estudianteId;
      if (!isOid(estudianteId)) {
        results.errors++;
        results.rows.push({ row: idx + 1, status: 'error', msg: 'estudianteId inválido' });
        continue;
      }

      const promedioTrimestral   = clamp01(n?.promedioTrimestral);
      const faltasJustificadas   = Math.max(0, Number(n?.faltasJustificadas ?? 0));
      const faltasInjustificadas = Math.max(0, Number(n?.faltasInjustificadas ?? 0));

      const setDoc = {};
      setDoc[`${tri}.promedioTrimestral`]   = promedioTrimestral;
      setDoc[`${tri}.faltasJustificadas`]   = faltasJustificadas;
      setDoc[`${tri}.faltasInjustificadas`] = faltasInjustificadas;

      try {
        const doc = await Calificacion.findOneAndUpdate(
          {
            estudiante:  estudianteId,
            curso:       cursoId,
            materia:     materiaId,
            anioLectivo: anioLectivoId,
          },
          {
            $set: setDoc,
            $setOnInsert: {
              estudiante:  estudianteId,
              curso:       cursoId,
              materia:     materiaId,
              anioLectivo: anioLectivoId,
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

        // hooks del modelo ya recalcularon derivados
        results.updated++;
        results.rows.push({
          row: idx + 1,
          status: 'ok',
          estudianteId,
          tri,
          promedioTrimestral: doc?.[tri]?.promedioTrimestral ?? promedioTrimestral
        });

      } catch (e) {
        results.errors++;
        results.rows.push({ row: idx + 1, status: 'error', msg: e.message });
      }
    }

    return res.status(200).json(results);
  } catch (err) { next(err); }
};


exports.cargarEvaluacionFinal = async (req, res, next) => {
  try {
    const { cursoId, anioLectivoId, materiaId, notas } = req.body;

    if (!isOid(cursoId))       return next(new ErrorResponse('cursoId inválido', 400));
    if (!isOid(anioLectivoId)) return next(new ErrorResponse('anioLectivoId inválido o faltante', 400));
    if (!isOid(materiaId))     return next(new ErrorResponse('materiaId inválido', 400));
    if (!Array.isArray(notas) || !notas.length) {
      return next(new ErrorResponse('notas debe ser un array con al menos 1 elemento', 400));
    }

    // Permisos (profesor asignado)
    await assertProfesorAsignado(req.user, cursoId, materiaId);

    const results = { ok: true, updated: 0, errors: 0, rows: [] };

    for (let idx = 0; idx < notas.length; idx++) {
      const n = notas[idx];
      const estudianteId = n?.estudianteId;
      let evaluacionFinal = clamp01(n?.evaluacionFinal);

      if (!isOid(estudianteId)) {
        results.errors++;
        results.rows.push({ row: idx + 1, status: 'error', msg: 'estudianteId inválido' });
        continue;
      }

      try {
        const doc = await Calificacion.findOneAndUpdate(
          {
            estudiante:  estudianteId,
            curso:       cursoId,
            materia:     materiaId,
            anioLectivo: anioLectivoId,
          },
          {
            $set: { evaluacionFinal },
            $setOnInsert: {
              estudiante:  estudianteId,
              curso:       cursoId,
              materia:     materiaId,
              anioLectivo: anioLectivoId,
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

        results.updated++;
        results.rows.push({
          row: idx + 1,
          status: 'ok',
          estudianteId,
          evaluacionFinal: doc?.evaluacionFinal ?? evaluacionFinal,
          promedioTrimestralAnual: doc?.promedioTrimestralAnual,
          notaPromocion: doc?.notaPromocion,
          cualitativaFinal: doc?.cualitativaFinal,
          observacionFinal: doc?.observacionFinal,
        });

      } catch (e) {
        results.errors++;
        results.rows.push({ row: idx + 1, status: 'error', msg: e.message });
      }
    }

    return res.status(200).json(results);
  } catch (err) { next(err); }
};
