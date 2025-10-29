// models/AsistenciaLaborable.js
const mongoose = require('mongoose');

const AsistenciaLaborableSchema = new mongoose.Schema(
  {
    curso:      { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
    anioLectivo:{ type: mongoose.Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },
    materia:    { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
    trimestre:  { type: String, enum: ['T1', 'T2', 'T3'], required: true },
    diasLaborables: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

// Un trimestre por curso/año/materia
AsistenciaLaborableSchema.index(
  { curso: 1, anioLectivo: 1, materia: 1, trimestre: 1 },
  { unique: true }
);

module.exports = mongoose.model('AsistenciaLaborable', AsistenciaLaborableSchema);
