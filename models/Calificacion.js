const mongoose = require('mongoose');
const { Schema } = mongoose;

const TRIMESTRES = ['T1','T2','T3'];

const CalificacionSchema = new Schema({
  cursoId:       { type: Schema.Types.ObjectId, ref: 'Curso', required: true },
  anioLectivoId: { type: Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },
  materiaId:     { type: Schema.Types.ObjectId, ref: 'Materia', required: true },
  estudianteId:  { type: Schema.Types.ObjectId, ref: 'Estudiante', required: true },
  trimestre:     { type: String, enum: TRIMESTRES, required: true },
  promedioTrimestral: { type: Number, min: 0, max: 10, default: null },
  cualitativa: { type: String, default: null }
}, { timestamps: true });

CalificacionSchema.index(
  { cursoId:1, anioLectivoId:1, materiaId:1, estudianteId:1, trimestre:1 },
  { unique: true, name: 'unique_calif_clave_trimestre' }
);

module.exports = mongoose.model('Calificacion', CalificacionSchema);
