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
    .populate('anioLectivo', 'nombre orden')
    .populate('profesorTutor', 'nombre email')
    .populate('estudiantes', 'nombre')
    .populate('materias.materia', 'nombre')        // muestra nombre de materia
    .populate('materias.profesor', 'nombre email') // y profesor responsable
    // .populate('nextCursoId', 'nombre')           // opcional, el front ya resuelve por ID
    .lean();

  res.json({ ok: true, data });
});

// GET /api/cursos/:id
exports.getOneById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isOid(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

  const curso = await Curso.findById(id)
    .populate('anioLectivo', 'nombre orden')
    .populate('profesorTutor', 'nombre email')
    .populate('estudiantes', 'nombre')
    .populate('materias.materia', 'nombre')
    .populate('materias.profesor', 'nombre email')
    // .populate('nextCursoId', 'nombre')          // opcional
    ;

  if (!curso) return res.status(404).json({ ok: false, message: 'Curso no encontrado' });
  res.json({ ok: true, data: curso });
});

// POST /api/cursos
exports.createCurso = asyncHandler(async (req, res) => {
  const nombre = req.body?.nombre;
  const anioLectivo =
    req.body?.anioLectivo ?? req.body?.aniolectivo ?? req.body?.anio_lectivo;
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

  // 🆕 nuevos campos
  let orden = req.body.orden;
  if (orden !== undefined && orden !== null && orden !== '') {
    orden = Number(orden);
    if (Number.isNaN(orden) || orden < 0) {
      return res.status(400).json({
        ok: false,
        message: 'El campo "orden" debe ser un número mayor o igual a 0',
      });
    }
  } else {
    orden = 0;
  }

  let nextCursoId = req.body.nextCursoId ?? null;
  if (nextCursoId && !isOid(nextCursoId)) {
    return res
      .status(400)
      .json({ ok: false, message: 'nextCursoId inválido' });
  }

  let activo = req.body.activo;
  if (typeof activo !== 'boolean') {
    activo = true;
  }

  try {
    const created = await Curso.create({
      nombre: String(nombre).trim(),
      anioLectivo,
      profesorTutor,
      estudiantes,
      materias,
      orden,
      nextCursoId,
      activo,
    });

    const curso = await Curso.findById(created._id)
      .populate('anioLectivo', 'nombre orden')
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

  const rawAL =
    req.body?.anioLectivo ?? req.body?.aniolectivo ?? req.body?.anio_lectivo;
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

  // 🆕 actualizar orden
  if (req.body.orden !== undefined) {
    let orden = req.body.orden;
    if (orden === null || orden === '') {
      orden = 0;
    }
    orden = Number(orden);
    if (Number.isNaN(orden) || orden < 0) {
      return res.status(400).json({
        ok: false,
        message: 'El campo "orden" debe ser un número mayor o igual a 0',
      });
    }
    update.orden = orden;
  }

  // 🆕 actualizar nextCursoId
  if (req.body.nextCursoId !== undefined) {
    const nextCursoId = req.body.nextCursoId;
    if (nextCursoId === null || nextCursoId === '') {
      update.nextCursoId = null;
    } else if (isOid(nextCursoId)) {
      update.nextCursoId = nextCursoId;
    } else {
      return res.status(400).json({
        ok: false,
        message: 'nextCursoId inválido',
      });
    }
  }

  // 🆕 actualizar activo
  if (typeof req.body.activo === 'boolean') {
    update.activo = req.body.activo;
  }

  try {
    const curso = await Curso.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .populate('anioLectivo', 'nombre orden')
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
