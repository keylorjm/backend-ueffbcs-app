// models/Estudiante.js
const { Schema, model } = require('mongoose');

const EstudianteSchema = Schema({
  nombre:  { type: String, required: [true, 'El nombre es obligatorio'] },
  cedula:  { type: String, required: [true, 'La cédula es obligatoria'], unique: true },
  celular: { type: String, required: [true, 'El N. de celular es obligatorio'] },
  email:   { type: String, required: [true, 'El correo es obligatorio'], unique: true }  
});

// expose uid en lugar de _id
EstudianteSchema.methods.toJSON = function () {
  const { __v, _id, ...estudiante } = this.toObject();
  estudiante.uid = _id;
  return estudiante;
};

module.exports = model('Estudiante', EstudianteSchema);

