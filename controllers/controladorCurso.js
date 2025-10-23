// controllers/controladorCurso.js
const mongoose = require('mongoose');
const Curso = require('../models/Curso');
const ErrorResponse = require('../utils/errorResponse');

const isOid = (s) => typeof s === 'string' && mongoose.isValidObjectId(s);

exports.getOneById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isOid(id)) return next(new ErrorResponse(`ID inválido: ${id}`, 400));

    const doc = await Curso.findById(id)
      .populate('anioLectivo')
      .populate('profesorTutor', 'nombre correo cedula rol')
      .populate('estudiantes', 'nombre cedula email')
      .populate({ path: 'materias.materia', select: 'nombre descripcion' })
      .populate({ path: 'materias.profesor', select: 'nombre correo cedula rol' });

    if (!doc) return next(new ErrorResponse('Curso no encontrado', 404));
    res.status(200).json({ ok: true, data: doc });
  } catch (err) { next(err); }
};

exports.getAllCursos = async (req, res, next) => {
  try {
    const { profesorId } = req.query;
    const filtro = {};

    // Si quieres que un profesor vea los cursos donde tiene al menos UNA materia asignada:
    if (profesorId && isOid(profesorId)) {
      filtro['materias.profesor'] = profesorId;
    }

    const cursos = await Curso.find(filtro)
      .populate('anioLectivo')
      .populate('profesorTutor', 'nombre correo cedula rol')
      .populate('estudiantes', 'nombre cedula email')
      .populate({ path: 'materias.materia', select: 'nombre descripcion' })
      .populate({ path: 'materias.profesor', select: 'nombre correo cedula rol' })
      .sort({ nombre: 1 })
      .lean();

    res.status(200).json({ ok: true, cursos });
  } catch (err) { next(err); }
};

exports.createCurso = async (req, res, next) => {
  try {
    const { nombre, anioLectivo, profesorTutor, estudiantes, materias } = req.body;

    if (!nombre) return next(new ErrorResponse('Falta nombre', 400));
    if (!isOid(anioLectivo)) return next(new ErrorResponse('anioLectivo inválido', 400));
    if (!isOid(profesorTutor)) return next(new ErrorResponse('profesorTutor inválido', 400));
    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
      return next(new ErrorResponse('Debe seleccionar al menos un estudiante', 400));
    }
    if (!Array.isArray(materias) || materias.length === 0) {
      return next(new ErrorResponse('Debe seleccionar al menos una materia', 400));
    }
    // Validar cada materia asignada
    for (const m of materias) {
      if (!isOid(m?.materia) || !isOid(m?.profesor)) {
        return next(new ErrorResponse('Cada materia debe tener materia y profesor válidos', 400));
      }
    }
    // Validar cada estudiante
    for (const e of estudiantes) {
      if (!isOid(e)) return next(new ErrorResponse('Algún estudiante tiene ID inválido', 400));
    }

    const nuevo = await Curso.create({ nombre, anioLectivo, profesorTutor, estudiantes, materias });

    const curso = await Curso.findById(nuevo._id)
      .populate('anioLectivo')
      .populate('profesorTutor', 'nombre correo cedula rol')
      .populate('estudiantes', 'nombre cedula email')
      .populate({ path: 'materias.materia', select: 'nombre descripcion' })
      .populate({ path: 'materias.profesor', select: 'nombre correo cedula rol' })
      .lean();

    res.status(201).json({ ok: true, curso });
  } catch (err) { next(err); }
};

exports.updateCurso = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isOid(id)) return next(new ErrorResponse(`ID inválido: ${id}`, 400));

    const { nombre, anioLectivo, profesorTutor, estudiantes, materias } = req.body;

    // Validaciones opcionales si vienen campos
    if (anioLectivo && !isOid(anioLectivo)) return next(new ErrorResponse('anioLectivo inválido', 400));
    if (profesorTutor && !isOid(profesorTutor)) return next(new ErrorResponse('profesorTutor inválido', 400));
    if (Array.isArray(estudiantes)) {
      for (const e of estudiantes) {
        if (!isOid(e)) return next(new ErrorResponse('Algún estudiante tiene ID inválido', 400));
      }
    }
    if (Array.isArray(materias)) {
      for (const m of materias) {
        if (!isOid(m?.materia) || !isOid(m?.profesor)) {
          return next(new ErrorResponse('Cada materia debe tener materia y profesor válidos', 400));
        }
      }
    }

    const curso = await Curso.findByIdAndUpdate(
      id,
      { $set: { nombre, anioLectivo, profesorTutor, estudiantes, materias } },
      { new: true, runValidators: true }
    )
      .populate('anioLectivo')
      .populate('profesorTutor', 'nombre correo cedula rol')
      .populate('estudiantes', 'nombre cedula email')
      .populate({ path: 'materias.materia', select: 'nombre descripcion' })
      .populate({ path: 'materias.profesor', select: 'nombre correo cedula rol' })
      .lean();

    if (!curso) return next(new ErrorResponse(`No se encontró curso con ID ${id}`, 404));
    res.status(200).json({ ok: true, curso });
  } catch (err) { next(err); }
};

exports.deleteCurso = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isOid(id)) return next(new ErrorResponse(`ID inválido: ${id}`, 400));
    const curso = await Curso.findByIdAndDelete(id).lean();
    if (!curso) return next(new ErrorResponse(`No se encontró curso con ID ${id}`, 404));
    res.status(200).json({ ok: true, data: {} });
  } catch (err) { next(err); }
};
