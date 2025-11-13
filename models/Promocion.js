// models/Promocion.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PromocionSchema = new Schema(
  {
    estudiante: { type: Schema.Types.ObjectId, ref: 'Estudiante', required: true },
    cursoAnterior: { type: Schema.Types.ObjectId, ref: 'Curso', required: true },
    cursoNuevo: { type: Schema.Types.ObjectId, ref: 'Curso', required: true },
    anioLectivoAnterior: { type: Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },
    anioLectivoNuevo: { type: Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },

    promedioFinal: { type: Number, required: true }, // 0..10
    asistencia: { type: Number, required: true },    // 0..1 (ej: 0.87 = 87%)
    aprobado: { type: Boolean, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promocion', PromocionSchema);
