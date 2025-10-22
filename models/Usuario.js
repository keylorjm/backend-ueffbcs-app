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
        select: false // No devolver la clave en las consultas por defecto
    },
    rol: {
        type: String,
        enum: ['profesor', 'admin', 'estudiante'], // Incluí estudiante para el CRUD
        default: 'profesor'
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
});

// Middleware: Encriptar la clave antes de guardar
UsuarioSchema.pre('save', async function(next) {
    // Solo si la clave ha sido modificada (incluye creación)
    if (!this.isModified('clave')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.clave = await bcrypt.hash(this.clave, salt);
    next();
});

// --- Métodos del Schema ---

// Generar y retornar JWT (Corregido con fallback de expiración)
UsuarioSchema.methods.getSignedJwtToken = function() {
    // Usa '1h' (una hora) si JWT_EXPIRE no está definida en .env
    const expiresIn = process.env.JWT_EXPIRE || '1h'; 
    
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: expiresIn
    });
};

// Comparar la clave ingresada con la clave hasheada en la DB
UsuarioSchema.methods.getPasswordMatch = async function(claveIngresada) {
    return await bcrypt.compare(claveIngresada, this.clave); 
};

// Generar token de restablecimiento de contraseña
UsuarioSchema.methods.getResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutos

    return resetToken; 
};

module.exports = mongoose.model('Usuario', UsuarioSchema);