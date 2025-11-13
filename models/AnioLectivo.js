// models/AnioLectivo.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AnioLectivoSchema = new Schema(
  {
    nombre: { type: String, required: true },              // p.ej. "2024-2025"
    fechaInicio: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    actual: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },

    // NUEVO: facilita encontrar el "siguiente" año
    orden: {
      type: Number,
      default: 0,    // o null si prefieres
      min: 0,
    },
  },
  { timestamps: true }
);

// (opcional) virtual de ejemplo
AnioLectivoSchema.virtual('rangoTexto').get(function () {
  try {
    const y1 = this.fechaInicio ? this.fechaInicio.getFullYear() : '';
    const y2 = this.fechaFin ? this.fechaFin.getFullYear() : '';
    return y1 && y2 && y1 !== y2 ? `${y1}-${y2}` : this.nombre;
  } catch {
    return this.nombre;
  }
});

module.exports = mongoose.model('AnioLectivo', AnioLectivoSchema);
