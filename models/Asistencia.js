// models/Asistencia.js
const mongoose = require('mongoose');

const TrimestreAsistenciaSchema = new mongoose.Schema(
  {
    faltasJustificadas:   { type: Number, min: 0, default: 0 },
    faltasInjustificadas: { type: Number, min: 0, default: 0 },
    diasLaborados:        { type: Number, min: 0, default: 0 }, // guardado por conveniencia (global duplicado por estudiante)
  },
  { _id: false }
);

const AsistenciaSchema = new mongoose.Schema(
  {
    anioLectivo: { type: mongoose.Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },
    curso:       { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
    materia:     { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
    estudiante:  { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },

    T1: { type: TrimestreAsistenciaSchema, default: () => ({}) },
    T2: { type: TrimestreAsistenciaSchema, default: () => ({}) },
    T3: { type: TrimestreAsistenciaSchema, default: () => ({}) },
  },
  { timestamps: true }
);

AsistenciaSchema.index(
  { anioLectivo: 1, curso: 1, materia: 1, estudiante: 1 },
  { unique: true, name: 'uniq_asist_anio_curso_materia_est' }
);

module.exports = mongoose.model('Asistencia', AsistenciaSchema);
