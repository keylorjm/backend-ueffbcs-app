// models/Matricula.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MatriculaSchema = new Schema(
  {
    estudiante: { type: Schema.Types.ObjectId, ref: 'Estudiante', required: true },
    anioLectivo: { type: Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },
    curso: { type: Schema.Types.ObjectId, ref: 'Curso', required: true },
    estado: {
      type: String,
      enum: ['activa', 'retirada', 'aprobada', 'reprobada'],
      default: 'activa',
    },
  },
  { timestamps: true }
);

// Idempotencia: evita duplicados
MatriculaSchema.index({ estudiante: 1, anioLectivo: 1, curso: 1 }, { unique: true });

module.exports = mongoose.model('Matricula', MatriculaSchema);
