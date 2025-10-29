// models/AsistenciaFalta.js
const mongoose = require('mongoose');

const AsistenciaFaltaSchema = new mongoose.Schema(
  {
    estudiante: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudiante', required: true },
    curso:      { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
    anioLectivo:{ type: mongoose.Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },
    materia:    { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
    trimestre:  { type: String, enum: ['T1', 'T2', 'T3'], required: true },
    faltasJustificadas:   { type: Number, min: 0, default: 0 },
    faltasInjustificadas: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

// Un registro por estudiante/curso/año/materia/trimestre
AsistenciaFaltaSchema.index(
  { estudiante: 1, curso: 1, anioLectivo: 1, materia: 1, trimestre: 1 },
  { unique: true }
);

module.exports = mongoose.model('AsistenciaFalta', AsistenciaFaltaSchema);
