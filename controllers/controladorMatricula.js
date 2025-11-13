// controllers/matricula.controller.js
const mongoose = require('mongoose');
const Curso = require('../models/Curso');
const { matricularSiguienteAnio } = require('../services/promocionService');

const { Types } = mongoose;

/**
 * POST /api/matricula/auto
 * body: { estudianteId, anioLectivoActualId, cursoActualId }
 *
 * Matricula a UN estudiante al siguiente año si APRUEBA.
 */
async function autoMatricular(req, res) {
  try {
    const { estudianteId, anioLectivoActualId, cursoActualId } = req.body ?? {};

    if (!estudianteId || !anioLectivoActualId || !cursoActualId) {
      return res.status(400).json({ ok: false, message: 'Faltan parámetros' });
    }

    if (!Types.ObjectId.isValid(estudianteId)) {
      return res.status(400).json({ ok: false, message: 'estudianteId inválido' });
    }
    if (!Types.ObjectId.isValid(anioLectivoActualId)) {
      return res.status(400).json({ ok: false, message: 'anioLectivoActualId inválido' });
    }
    if (!Types.ObjectId.isValid(cursoActualId)) {
      return res.status(400).json({ ok: false, message: 'cursoActualId inválido' });
    }

    const r = await matricularSiguienteAnio(estudianteId, anioLectivoActualId, cursoActualId);

    if (!r.ok && r.reason === 'NO_APROBADO') {
      return res.status(400).json({ ok: false, message: r.message, reason: r.reason });
    }

    return res.json({ ok: r.ok, ...r });
  } catch (e) {
    console.error('[autoMatricular] error:', e);
    return res.status(500).json({ ok: false, message: e?.message ?? 'Error interno' });
  }
}

/**
 * POST /api/matricula/auto-bulk
 * body: { anioLectivoId, cursoId }
 *
 * Recorre todos los estudiantes del curso y:
 *  - si APRUEBAN → intenta matricularlos al siguiente año/curso
 *  - si NO aprueban → los cuenta como NO_APROBADO
 */
async function autoMatricularBulk(req, res) {
  try {
    const { anioLectivoId, cursoId } = req.body ?? {};

    if (!anioLectivoId || !cursoId) {
      return res.status(400).json({ ok: false, message: 'Faltan parámetros' });
    }

    if (!Types.ObjectId.isValid(anioLectivoId)) {
      return res.status(400).json({ ok: false, message: 'anioLectivoId inválido' });
    }
    if (!Types.ObjectId.isValid(cursoId)) {
      return res.status(400).json({ ok: false, message: 'cursoId inválido' });
    }

    const curso = await Curso.findById(cursoId)
      .select('estudiantes nombre anioLectivo')
      .lean();

    if (!curso) {
      return res.status(404).json({ ok: false, message: 'Curso no encontrado' });
    }

    const ids = extractEstudiantesIds(curso);
    let okCount = 0,
      ya = 0,
      noAprob = 0,
      err = 0;

    for (const estId of ids) {
      try {
        const r = await matricularSiguienteAnio(estId, anioLectivoId, cursoId);

        if (r.ok && r.already) ya++;
        else if (r.ok) okCount++;
        else if (r.reason === 'NO_APROBADO') noAprob++;
        else err++;
      } catch (e) {
        console.error('[autoMatricularBulk] error interno por estudiante', estId, e);
        err++;
      }
    }

    return res.json({
      ok: true,
      message: `Resultado: OK=${okCount}, YA=${ya}, NO_APROBADO=${noAprob}, ERROR=${err}`,
      stats: { ok: okCount, ya, noAprob, err, total: ids.length },
    });
  } catch (e) {
    console.error('[autoMatricularBulk] error:', e);
    return res.status(500).json({ ok: false, message: e?.message ?? 'Error interno' });
  }
}

/* ===== Helpers ===== */

/**
 * Extrae una lista de IDs de estudiante a partir del curso.
 * Para tu modelo actual, basta con leer curso.estudiantes.
 * Soporta:
 *   - ObjectId
 *   - documentos poblados { _id }
 */
function extractEstudiantesIds(curso) {
  const arr = Array.isArray(curso?.estudiantes) ? curso.estudiantes : [];
  const ids = [];

  for (const e of arr) {
    if (!e) continue;

    if (typeof e === 'string') {
      ids.push(e);
    } else if (typeof e === 'object' && (e._id || e.uid)) {
      ids.push(String(e._id ?? e.uid));
    }
  }

  return Array.from(new Set(ids)); // sin duplicados
}

module.exports = {
  autoMatricular,
  autoMatricularBulk,
};
