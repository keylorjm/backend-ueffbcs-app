// controllers/asistenciasController.js
const mongoose = require('mongoose');
const AsistenciaLaborable = require('../models/AsistenciaLaborable');
const AsistenciaFalta = require('../models/AsistenciaFalta');

function oid(id) {
  try { return new mongoose.Types.ObjectId(id); }
  catch { return null; }
}

// GET /api/asistencias/laborables?cursoId&anioLectivoId&materiaId&trimestre
exports.getLaborables = async (req, res) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre } = req.query;

    if (!cursoId || !anioLectivoId || !materiaId || !trimestre) {
      return res.status(400).json({ message: 'Faltan parámetros' });
    }

    const doc = await AsistenciaLaborable.findOne({
      curso: oid(cursoId),
      anioLectivo: oid(anioLectivoId),
      materia: oid(materiaId),
      trimestre
    }).lean();

    return res.json({ diasLaborables: doc?.diasLaborables ?? null });
  } catch (e) {
    console.error('[Asistencias] getLaborables error:', e);
    return res.status(500).json({ message: 'Error al obtener días laborables' });
  }
};

// POST /api/asistencias/laborables {cursoId, anioLectivoId, materiaId, trimestre, diasLaborables}
exports.setLaborables = async (req, res) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre, diasLaborables } = req.body;

    if (!cursoId || !anioLectivoId || !materiaId || !trimestre || diasLaborables == null) {
      return res.status(400).json({ message: 'Faltan datos' });
    }

    const filtro = {
      curso: oid(cursoId),
      anioLectivo: oid(anioLectivoId),
      materia: oid(materiaId),
      trimestre
    };

    const update = { $set: { diasLaborables: Number(diasLaborables) } };
    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };

    const doc = await AsistenciaLaborable.findOneAndUpdate(filtro, update, opts).lean();
    return res.json({ ok: true, data: doc, message: 'Días laborables guardados' });
  } catch (e) {
    console.error('[Asistencias] setLaborables error:', e);
    return res.status(500).json({ message: 'Error al guardar días laborables' });
  }
};

// GET /api/asistencias?cursoId&anioLectivoId&materiaId&trimestre
exports.listFaltas = async (req, res) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre } = req.query;

    if (!cursoId || !anioLectivoId || !materiaId || !trimestre) {
      return res.status(400).json({ message: 'Faltan parámetros' });
    }

    const rows = await AsistenciaFalta.find({
      curso: oid(cursoId),
      anioLectivo: oid(anioLectivoId),
      materia: oid(materiaId),
      trimestre
    }, { estudiante: 1, faltasJustificadas: 1, faltasInjustificadas: 1 })
      .lean();

    const estudiantes = rows.map(r => ({
      estudianteId: String(r.estudiante),
      faltasJustificadas: r.faltasJustificadas ?? 0,
      faltasInjustificadas: r.faltasInjustificadas ?? 0
    }));

    return res.json({ estudiantes });
  } catch (e) {
    console.error('[Asistencias] listFaltas error:', e);
    return res.status(500).json({ message: 'Error al obtener faltas' });
  }
};

// POST /api/asistencias/bulk-faltas {cursoId, anioLectivoId, materiaId, trimestre, rows:[{estudianteId,faltasJustificadas, faltasInjustificadas}]}
exports.bulkFaltas = async (req, res) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre, rows } = req.body;

    if (!cursoId || !anioLectivoId || !materiaId || !trimestre || !Array.isArray(rows)) {
      return res.status(400).json({ message: 'Faltan datos o formato inválido' });
    }

    const bulk = AsistenciaFalta.collection.initializeUnorderedBulkOp();
    let count = 0;

    for (const r of rows) {
      const estudiante = oid(r.estudianteId);
      if (!estudiante) continue;

      bulk.find({
        estudiante,
        curso: oid(cursoId),
        anioLectivo: oid(anioLectivoId),
        materia: oid(materiaId),
        trimestre
      }).upsert().updateOne({
        $set: {
          faltasJustificadas: Math.max(0, Number(r.faltasJustificadas ?? 0)),
          faltasInjustificadas: Math.max(0, Number(r.faltasInjustificadas ?? 0))
        }
      });
      count++;
    }

    if (count === 0) {
      return res.status(400).json({ message: 'No hay filas válidas para procesar' });
    }

    const result = await bulk.execute();
    return res.json({ ok: true, result, message: 'Faltas guardadas' });
  } catch (e) {
    // Manejo de duplicados u otros
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Conflicto de índice único en asistencias', error: e });
    }
    console.error('[Asistencias] bulkFaltas error:', e);
    return res.status(500).json({ message: 'Error al guardar faltas' });
  }
};
