// models/Estudiante.js (MODIFICADO SIN ROL)

const { Schema, model } = require('mongoose');

const EstudianteSchema = Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio']
    },
    cedula: {
        type: String,
        required: [true, 'la cedula es obligatorio']
    },
    celular: {
        type: String,
        required: [true, 'El N. de celular es obligatorio']
    },
    email: {
        type: String,
        required: [true, 'El correo es obligatorio'],
        unique: true
    },
 
    
    estado: {
        type: Boolean,
        default: true
    }
});

// Sobreescribir el método toJSON para remover datos internos
EstudianteSchema.methods.toJSON = function() {
    const { __v, _id, ...estudiante } = this.toObject();
    estudiante.uid = _id; 
    return estudiante;
}

module.exports = model('Estudiante', EstudianteSchema);