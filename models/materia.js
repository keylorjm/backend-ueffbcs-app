// models/Materia.js

const { Schema, model } = require('mongoose');

const MateriaSchema = Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre de la materia es obligatorio'],
        unique: true
    },
    descripcion: {
        type: String,
        required: [true, 'La descripción es obligatoria']
    },
    // 🛑 CLAVE: Referencia a la colección 'Usuario'
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

// Sobreescribir toJSON (para renombrar _id a uid)
MateriaSchema.methods.toJSON = function() {
    const { __v, _id, ...materia } = this.toObject();
    materia.uid = _id; 
    return materia;
}

module.exports = model('Materia', MateriaSchema);