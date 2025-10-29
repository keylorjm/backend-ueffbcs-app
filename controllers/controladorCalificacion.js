// controllers/calificacionController.js
const mongoose = require('mongoose');
const Calificacion = require('../models/Calificacion');
const { Types } = mongoose;

const TRIMESTRES = ['T1', 'T2', 'T3'];
const isOid = (v) => Types.ObjectId.isValid(v);

function cualitativaDesde(nota /* 0..10 | null */) {
  if (nota === null || nota === undefined) return null;
  if (nota >= 9) return 'Excelente';
  if (nota >= 7) return 'Bueno';
  if (nota >= 5) return 'Regular';
  return 'Insuficiente';
}

/**
 * GET /api/calificaciones
 * Query:
 *  - cursoId (ObjectId, requerido)
 *  - anioLectivoId (ObjectId, requerido)
 *  - materiaId (ObjectId, requerido)
 *  - trimestre (T1|T2|T3, opcional; si no se envía trae todos)
 *
 * Devuelve: { estudiantes: [{ estudianteId, promedioTrimestral }] }
 */
exports.getNotas = async (req, res) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre } = req.query;

    if (!isOid(cursoId) || !isOid(anioLectivoId) || !isOid(materiaId)) {
      return res.status(400).json({ message: 'IDs inválidos (cursoId/anioLectivoId/materiaId).' });
    }
    if (trimestre && !TRIMESTRES.includes(trimestre)) {
      return res.status(400).json({ message: 'Trimestre inválido. Use T1, T2 o T3.' });
    }

    const query = { cursoId, anioLectivoId, materiaId };
    if (trimestre) query.trimestre = trimestre;

    const docs = await Calificacion.find(query).lean();

    const estudiantes = (docs || []).map(d => ({
      estudianteId: String(d.estudianteId),
      promedioTrimestral: d.promedioTrimestral // 0..10 o null
    }));

    return res.json({ estudiantes });
  } catch (err) {
    console.error('[getNotas] Error:', err);
    return res.status(500).json({ message: 'Error interno al obtener notas', error: err?.message || String(err) });
  }
};

/**
 * POST /api/calificaciones/bulk-trimestre
 * Body:
 *  - cursoId (ObjectId, requerido)
 *  - anioLectivoId (ObjectId, requerido)
 *  - materiaId (ObjectId, requerido)
 *  - trimestre (T1|T2|T3, requerido)
 *  - rows: [{ estudianteId (ObjectId), promedioTrimestral (0..10 | null) }]
 *
 * Hace upsert por (cursoId, anioLectivoId, materiaId, estudianteId, trimestre).
 * Deduplica filas repetidas del mismo estudiante dentro del mismo payload.
 */
exports.bulkTrimestre = async (req, res) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre, rows } = req.body || {};

    // Validaciones de cabecera
    if (!isOid(cursoId) || !isOid(anioLectivoId) || !isOid(materiaId)) {
      return res.status(400).json({ message: 'IDs inválidos (cursoId/anioLectivoId/materiaId).' });
    }
    if (!TRIMESTRES.includes(trimestre)) {
      return res.status(400).json({ message: 'Trimestre inválido. Use T1, T2 o T3.' });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'rows vacío.' });
    }

    const ops = [];
    const ignoradas = [];
    const seen = new Set(); // evita duplicados del mismo estudiante dentro del payload

    for (const r of rows) {
      const estudianteId = r?.estudianteId;
      let nota = r?.promedioTrimestral;

      if (!isOid(estudianteId)) {
        ignoradas.push({ estudianteId, motivo: 'estudianteId inválido' });
        continue;
      }

      const key = String(estudianteId) + '|' + String(trimestre);
      if (seen.has(key)) {
        ignoradas.push({ estudianteId, motivo: 'fila duplicada en el mismo envío' });
        continue;
      }
      seen.add(key);

      // Permitir null; si viene número, validar 0..10
      if (nota !== null && nota !== undefined) {
        if (typeof nota !== 'number' || Number.isNaN(nota) || nota < 0 || nota > 10) {
          ignoradas.push({ estudianteId, motivo: 'promedioTrimestral fuera de rango 0..10' });
          continue;
        }
      } else {
        nota = null;
      }

      ops.push({
        updateOne: {
          filter: {
            cursoId,
            anioLectivoId,
            materiaId,
            estudianteId,
            trimestre
          },
          update: {
            $set: {
              promedioTrimestral: nota,
              cualitativa: cualitativaDesde(nota),
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      });
    }

    if (!ops.length) {
      return res.status(400).json({ message: 'No hay filas válidas para procesar.', ignoradas });
    }

    const result = await Calificacion.bulkWrite(ops, { ordered: false });
    return res.json({
      message: 'Notas guardadas',
      result,
      ignoradas
    });
  } catch (err) {
    console.error('[bulkTrimestre] Error:', err);

    // 11000 = Duplicate key (por índice único). Suele indicar índice viejo o duplicados históricos.
    if (err?.code === 11000) {
      return res.status(409).json({
        message: 'Conflicto de índice único en calificaciones (clave duplicada).',
        detail: err?.keyValue || null,
        hint: 'Verifique que el índice incluya {cursoId,anioLectivoId,materiaId,estudianteId,trimestre} y que no existan duplicados.'
      });
    }

    return res.status(500).json({ message: 'Error interno al guardar notas', error: err?.message || String(err) });
  }
};
