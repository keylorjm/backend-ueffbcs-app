// models/Usuario.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const crypto = require('crypto'); 

const UsuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio']
  },
  // 👇 NUEVO CAMPO
  cedula: {
    type: String,
    required: [true, 'La cédula es obligatoria'],
    unique: true, // evita duplicados a nivel DB
  },
  correo: {
    type: String,
    required: [true, 'El correo es obligatorio'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor, añade un correo válido'
    ]
  },
  clave: {
    type: String,
    required: [true, 'La clave es obligatoria'],
    minlength: 6,
    select: false
  },
  rol: {
    type: String,
    enum: ['profesor', 'admin'],
    default: 'profesor'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
});

// Hash de clave
UsuarioSchema.pre('save', async function(next) {
  if (!this.isModified('clave')) return next();
  const salt = await bcrypt.genSalt(10);
  this.clave = await bcrypt.hash(this.clave, salt);
  next();
});

UsuarioSchema.methods.getSignedJwtToken = function() {
  const expiresIn = process.env.JWT_EXPIRE || '1h'; 
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn });
};

UsuarioSchema.methods.getPasswordMatch = async function(claveIngresada) {
  return await bcrypt.compare(claveIngresada, this.clave); 
};

UsuarioSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken; 
};

module.exports = mongoose.model('Usuario', UsuarioSchema);
