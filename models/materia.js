// models/Materia.js
const { Schema, model, models } = require('mongoose');

const MateriaSchema = new Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la materia es obligatorio'],
    unique: true,
    trim: true
  },
  descripcion: {
    type: String,
    default: ''
  },
  // 🧑‍🏫 Profesor responsable de la materia
  profesor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  estado: {
    type: Boolean,
    default: true
  }
});

// Personaliza la salida JSON (quita __v, cambia _id→uid)
MateriaSchema.methods.toJSON = function() {
  const { __v, _id, ...materia } = this.toObject();
  materia.uid = _id;
  return materia;
};

// 👇 FIX para evitar OverwriteModelError en reinicios o importaciones múltiples
module.exports = models.Materia || model('Materia', MateriaSchema);
