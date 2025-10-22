// middlewares/ensureCursoDelProfesor.js
const mongoose = require('mongoose');
const Curso = require('../models/Curso');
const ErrorResponse = require('../utils/errorResponse');

module.exports = async function ensureCursoDelProfesor(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.uid;
    const cursoId = req.body?.cursoId || req.query?.cursoId || req.params?.cursoId;

    if (!userId) return next(new ErrorResponse('No autenticado', 401));
    if (!mongoose.isValidObjectId(cursoId)) return next(new ErrorResponse('cursoId inválido', 400));

    const curso = await Curso.findById(cursoId).select('profesorTutor').lean();
    if (!curso) return next(new ErrorResponse('Curso no encontrado', 404));
    if (String(curso.profesorTutor) !== String(userId) && req.user?.rol !== 'admin') {
      return next(new ErrorResponse('No autorizado para este curso', 403));
    }
    next();
  } catch (e) { next(e); }
};
