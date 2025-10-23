// models/Curso.js
const { Schema, model, Types } = require('mongoose');

const MateriaAsignadaSchema = new Schema({
  materia:   { type: Types.ObjectId, ref: 'Materia', required: true },
  profesor:  { type: Types.ObjectId, ref: 'Usuario', required: true } // responsable de esa materia
}, { _id: false });

const CursoSchema = new Schema({
  nombre:        { type: String, required: true, unique: true },
  anioLectivo:   { type: Types.ObjectId, ref: 'AnioLectivo', required: true },
  profesorTutor: { type: Types.ObjectId, ref: 'Usuario', required: true }, // tutor general
  // Estudiantes inscritos
  estudiantes:   [{ type: Types.ObjectId, ref: 'Estudiante', required: true }],
  // Materias impartidas en el curso (cada una con su profesor responsable)
  materias:      { type: [MateriaAsignadaSchema], default: [] },
}, { timestamps: true });

module.exports = model('Curso', CursoSchema);
