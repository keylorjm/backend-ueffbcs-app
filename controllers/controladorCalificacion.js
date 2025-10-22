// controllers/controladorCalificacion.js
const mongoose = require('mongoose');
const Calificacion = require('../models/Calificacion');
const ErrorResponse = require('../utils/errorResponse');

const isOid = (s) => typeof s === 'string' && mongoose.isValidObjectId(s);
const isTri = (t) => ['T1','T2','T3'].includes(String(t || '').toUpperCase());
const clamp01 = (n, min=0, max=10) => {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return 0;
  return Math.max(min, Math.min(max, v));
};

/**
 * GET /api/calificaciones?cursoId=&anioLectivoId=&materiaId=&trimestre=T1|T2|T3
 * Retorna calificaciones del curso/materia/año (se puede ignorar 'trimestre' para traer todo).
 */
exports.listarPorCursoMateriaTrimestre = async (req, res, next) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre } = req.query;

    if (!isOid(cursoId))       return next(new ErrorResponse('cursoId inválido', 400));
    if (!isOid(anioLectivoId)) return next(new ErrorResponse('anioLectivoId inválido', 400));
    if (!isOid(materiaId))     return next(new ErrorResponse('materiaId inválido', 400));
    if (trimestre && !isTri(trimestre)) {
      return next(new ErrorResponse('trimestre debe ser T1|T2|T3', 400));
    }

    const rows = await Calificacion.find({
      curso: cursoId,
      anioLectivo: anioLectivoId,
      materia: materiaId,
    })
      .select({ estudiante: 1, curso: 1, materia: 1, anioLectivo: 1, T1:1, T2:1, T3:1, promedioTrimestralAnual:1, evaluacionFinal:1, notaPromocion:1 })
      .populate({ path: 'estudiante', select: 'nombre apellido uid' })
      .lean();

    // Si se pasó 'trimestre', no filtramos los docs (para no perder anual), pero es útil en el front
    res.json({ ok: true, data: rows });
  } catch (err) { next(err); }
};

/**
 * POST /api/calificaciones/bulk-trimestre
 * body: {
 *   cursoId, anioLectivoId, materiaId, trimestre, 
 *   notas:[{estudianteId, promedioTrimestral, faltasJustificadas, faltasInjustificadas}]
 * }
 * - NO se recibe calificacionCualitativa: el modelo la autogenera según promedio.
 */
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

    const tri = String(trimestre).toUpperCase();

    const ops = notas.map((n, idx) => {
      const estudianteId = n?.estudianteId;
      if (!isOid(estudianteId)) {
        throw new ErrorResponse(`estudianteId inválido en fila ${idx + 1}`, 400);
      }

      // Sanea valores numéricos y rangos (0–10)
      const promedioTrimestral   = clamp01(n?.promedioTrimestral);
      const faltasJustificadas   = Math.max(0, Number(n?.faltasJustificadas ?? 0));
      const faltasInjustificadas = Math.max(0, Number(n?.faltasInjustificadas ?? 0));

      // Actualizamos con dot-paths para disparar el hook de findOneAndUpdate y que el modelo compute cualitativa/cuanti
      const setDoc = {};
      setDoc[`${tri}.promedioTrimestral`]   = promedioTrimestral;
      setDoc[`${tri}.faltasJustificadas`]   = faltasJustificadas;
      setDoc[`${tri}.faltasInjustificadas`] = faltasInjustificadas;

      return {
        updateOne: {
          filter: {
            estudiante:  estudianteId,
            curso:       cursoId,
            materia:     materiaId,
            anioLectivo: anioLectivoId,
          },
          update: {
            $set: setDoc,
            // En upsert, fija las claves de identidad (evita cambios futuros indeseados)
            $setOnInsert: {
              estudiante:  estudianteId,
              curso:       cursoId,
              materia:     materiaId,
              anioLectivo: anioLectivoId,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Calificacion.bulkWrite(ops, { ordered: false });
    res.status(200).json({ ok: true, data: result });
  } catch (err) { next(err); }
};

/**
 * POST /api/calificaciones/final
 * body: { cursoId, anioLectivoId, materiaId, notas:[{estudianteId, evaluacionFinal}] }
 */
exports.cargarEvaluacionFinal = async (req, res, next) => {
  try {
    const { cursoId, anioLectivoId, materiaId, notas } = req.body;

    if (!isOid(cursoId))       return next(new ErrorResponse('cursoId inválido', 400));
    if (!isOid(anioLectivoId)) return next(new ErrorResponse('anioLectivoId inválido o faltante', 400));
    if (!isOid(materiaId))     return next(new ErrorResponse('materiaId inválido', 400));
    if (!Array.isArray(notas) || !notas.length) {
      return next(new ErrorResponse('notas debe ser un array con al menos 1 elemento', 400));
    }

    const ops = notas.map((n, idx) => {
      const estudianteId   = n?.estudianteId;
      let evaluacionFinal  = Number(n?.evaluacionFinal ?? 0);
      if (!isOid(estudianteId)) {
        throw new ErrorResponse(`estudianteId inválido en fila ${idx + 1}`, 400);
      }
      evaluacionFinal = clamp01(evaluacionFinal);

      return {
        updateOne: {
          filter: {
            estudiante:  estudianteId,
            curso:       cursoId,
            materia:     materiaId,
            anioLectivo: anioLectivoId,
          },
          update: {
            $set: { evaluacionFinal },
            $setOnInsert: {
              estudiante:  estudianteId,
              curso:       cursoId,
              materia:     materiaId,
              anioLectivo: anioLectivoId,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Calificacion.bulkWrite(ops, { ordered: false });
    res.status(200).json({ ok: true, data: result });
  } catch (err) { next(err); }
};
