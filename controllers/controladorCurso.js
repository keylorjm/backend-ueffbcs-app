// controllers/curso.controller.js
const { response } = require("express");
const mongoose = require("mongoose");
const Curso = require("../models/Curso");
const ErrorResponse = require("../utils/errorResponse");

const isValidId = (id) => mongoose.isValidObjectId(id);

// ================================
// GET /api/cursos/:id  (con populate)
// ================================
const getOneById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ valida valores no válidos y strings "null"/"undefined"
    if (
      !id ||
      id === "null" ||
      id === "undefined" ||
      !mongoose.isValidObjectId(id)
    ) {
      return next(new ErrorResponse(`ID inválido: ${id}`, 400));
    }

    const doc = await Curso.findById(id)
      .populate("anioLectivo")
      .populate("profesorTutor")
      .populate("materias")
      .populate("estudiantes");

    if (!doc) {
      return next(new ErrorResponse("Curso no encontrado", 404));
    }

    return res.status(200).json({ ok: true, data: doc });
  } catch (err) {
    return next(err);
  }
};

const getAllCursos = async (req, res = response, next) => {
  try {
    const { profesorId } = req.query;
    const filtro = {};

    if (profesorId) {
      if (!isValidId(profesorId)) {
        return next(
          new ErrorResponse(`profesorId inválido: ${profesorId}`, 400)
        );
      }
      filtro.profesorTutor = profesorId;
    }

    const cursos = await Curso.find(filtro)
      .populate({ path: "profesorTutor", select: "nombre apellido correo" })
      .populate({ path: "materias", select: "nombre descripcion" })
      .populate({ path: "estudiantes", select: "nombre apellido uid" })
      .sort({ nombre: 1 })
      .lean({ virtuals: true });

    return res.status(200).json({ ok: true, cursos });
  } catch (err) {
    return next(err);
  }
};

// ================================
// POST /api/cursos
// ================================
const createCurso = async (req, res = response, next) => {
  try {
    const nuevo = await Curso.create(req.body);

    // Devolvemos el curso recién creado con populate para consistencia del front
    const curso = await Curso.findById(nuevo._id)
      .populate({ path: "profesorTutor", select: "nombre apellido correo" })
      .populate({ path: "materias", select: "nombre descripcion" })
      .populate({ path: "estudiantes", select: "nombre apellido uid" })
      .lean({ virtuals: true });

    return res.status(201).json({ ok: true, curso });
  } catch (err) {
    return next(err);
  }
};

// ================================
// PUT /api/cursos/:id
// ================================
const updateCurso = async (req, res = response, next) => {
  const { id } = req.params;

  try {
    if (!isValidId(id)) {
      return next(new ErrorResponse(`ID inválido: ${id}`, 400));
    }

    const curso = await Curso.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate({ path: "profesorTutor", select: "nombre apellido correo" })
      .populate({ path: "materias", select: "nombre descripcion" })
      .populate({ path: "estudiantes", select: "nombre apellido uid" })
      .lean({ virtuals: true });

    if (!curso) {
      return next(new ErrorResponse(`No se encontró curso con ID ${id}`, 404));
    }

    return res.status(200).json({ ok: true, curso });
  } catch (err) {
    return next(err);
  }
};

// ================================
// DELETE /api/cursos/:id
// ================================
const deleteCurso = async (req, res = response, next) => {
  const { id } = req.params;

  try {
    if (!isValidId(id)) {
      return next(new ErrorResponse(`ID inválido: ${id}`, 400));
    }

    const curso = await Curso.findByIdAndDelete(id).lean();
    if (!curso) {
      return next(new ErrorResponse(`No se encontró curso con ID ${id}`, 404));
    }

    return res.status(200).json({ ok: true, data: {} });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAllCursos,
  getOneById,
  createCurso,
  updateCurso,
  deleteCurso,
};
