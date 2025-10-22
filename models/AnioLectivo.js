// models/AnioLectivo.js
const mongoose = require('mongoose');

const AnioLectivoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      unique: true, // Índice único (ver nota más abajo)
    },
    fechaInicio: {
      type: Date,
      required: [true, 'La fecha de inicio es obligatoria'],
    },
    fechaFin: {
      type: Date,
      required: [true, 'La fecha de fin es obligatoria'],
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
      index: true,
    },
    actual: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Compatibilidad con frontends que usan uid
        ret.uid = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);


AnioLectivoSchema.virtual('rangoTexto').get(function () {
  const fi = this.fechaInicio ? new Date(this.fechaInicio) : null;
  const ff = this.fechaFin ? new Date(this.fechaFin) : null;
  const fmt = (d) =>
    d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';
  return `${fmt(fi)} - ${fmt(ff)}`;
});

module.exports = mongoose.model('AnioLectivo', AnioLectivoSchema);


