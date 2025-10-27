// controllers/controladorCurso.js
const { Types } = require('mongoose');
const Curso = require('../models/Curso');
const asyncHandler = require('../middleware/asyncHandler');

const isOid = (v) => typeof v === 'string' && Types.ObjectId.isValid(v);

function sanitizeMaterias(materiasRaw) {
  if (!Array.isArray(materiasRaw)) return [];
  const list = [];
  for (const it of materiasRaw) {
    const materia = it?.materia?.toString?.() ?? it?.materia ?? '';
    const profesor = it?.profesor?.toString?.() ?? it?.profesor ?? '';
    if (isOid(materia) && isOid(profesor)) list.push({ materia, profesor });
  }
  // quitar duplicadas por materia
  const out = [];
  const seen = new Set();
  for (const m of list) {
    const k = String(m.materia);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(m);
    }
  }
  return out;
}

// GET /api/cursos
exports.getAllCursos = asyncHandler(async (_req, res) => {
  const data = await Curso.find()
    .populate('anioLectivo', 'nombre')
    .populate('profesorTutor', 'nombre email')
    .populate('estudiantes', 'nombre')
    .populate('materias.materia', 'nombre')        // muestra nombre de materia
    .populate('materias.profesor', 'nombre email') // y profesor responsable
    .lean();

  res.json({ ok: true, data });
});

// GET /api/cursos/:id
exports.getOneById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isOid(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

  const curso = await Curso.findById(id)
    .populate('anioLectivo', 'nombre')
    .populate('profesorTutor', 'nombre email')
    .populate('estudiantes', 'nombre')
    .populate('materias.materia', 'nombre')
    .populate('materias.profesor', 'nombre email');

  if (!curso) return res.status(404).json({ ok: false, message: 'Curso no encontrado' });
  res.json({ ok: true, data: curso });
});

// POST /api/cursos
exports.createCurso = asyncHandler(async (req, res) => {
  // Tolerancia de nombres de campo (por si en el front llega mal escrito)
  const nombre = req.body?.nombre;
  const anioLectivo = req.body?.anioLectivo ?? req.body?.aniolectivo ?? req.body?.anio_lectivo;
  const profesorTutor = req.body?.profesorTutor ?? req.body?.profesor_tutor;

  if (!nombre || !String(nombre).trim())
    return res.status(400).json({ ok: false, message: 'El nombre es obligatorio' });

  if (!isOid(anioLectivo))
    return res.status(400).json({ ok: false, message: 'anioLectivo inválido' });

  if (!isOid(profesorTutor))
    return res.status(400).json({ ok: false, message: 'profesorTutor inválido' });

  const estudiantes = Array.isArray(req.body.estudiantes)
    ? req.body.estudiantes.filter(isOid)
    : [];

  const materias = sanitizeMaterias(req.body.materias);

  if (materias.length === 0) {
    return res.status(400).json({
      ok: false,
      message: 'Cada materia debe tener materia y profesor válidos',
    });
  }

  try {
    const created = await Curso.create({
      nombre: String(nombre).trim(),
      anioLectivo,
      profesorTutor,
      estudiantes,
      materias,
    });

    const curso = await Curso.findById(created._id)
      .populate('anioLectivo', 'nombre')
      .populate('profesorTutor', 'nombre email')
      .populate('estudiantes', 'nombre')
      .populate('materias.materia', 'nombre')
      .populate('materias.profesor', 'nombre email');

    res.status(201).json({ ok: true, data: curso });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe un curso con ese nombre en el año lectivo seleccionado.',
      });
    }
    throw err;
  }
});

// PUT /api/cursos/:id
exports.updateCurso = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isOid(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

  const update = {};

  if (typeof req.body.nombre === 'string' && req.body.nombre.trim())
    update.nombre = req.body.nombre.trim();

  const rawAL = req.body?.anioLectivo ?? req.body?.aniolectivo ?? req.body?.anio_lectivo;
  if (isOid(rawAL)) update.anioLectivo = rawAL;

  const rawPT = req.body?.profesorTutor ?? req.body?.profesor_tutor;
  if (isOid(rawPT)) update.profesorTutor = rawPT;

  if (Array.isArray(req.body.estudiantes))
    update.estudiantes = req.body.estudiantes.filter(isOid);

  if (Array.isArray(req.body.materias)) {
    const materias = sanitizeMaterias(req.body.materias);
    if (materias.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'Cada materia debe tener materia y profesor válidos',
      });
    }
    update.materias = materias;
  }

  try {
    const curso = await Curso.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('anioLectivo', 'nombre')
      .populate('profesorTutor', 'nombre email')
      .populate('estudiantes', 'nombre')
      .populate('materias.materia', 'nombre')
      .populate('materias.profesor', 'nombre email');

    if (!curso) return res.status(404).json({ ok: false, message: 'Curso no encontrado' });

    res.json({ ok: true, data: curso });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe un curso con ese nombre en el año lectivo seleccionado.',
      });
    }
    throw err;
  }
});

// DELETE /api/cursos/:id
exports.deleteCurso = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isOid(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

  const curso = await Curso.findByIdAndDelete(id);
  if (!curso) return res.status(404).json({ ok: false, message: 'Curso no encontrado' });

  res.json({ ok: true, message: 'Curso eliminado' });
});
