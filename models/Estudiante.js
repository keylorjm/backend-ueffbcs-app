// models/Estudiante.js
const { Schema, model } = require('mongoose');

const EstudianteSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },

    cedula: {
      type: String,
      required: [true, 'La cédula es obligatoria'],
      unique: true,
      trim: true,
    },

    celular: {
      type: String,
      required: [true, 'El N. de celular es obligatorio'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
    },

    // ---------------------------------------------
    // 🟩 Datos de matrícula (no requeridos al crear)
    // ---------------------------------------------

    curso: {
      type: Schema.Types.ObjectId,
      ref: 'Curso',
      default: null,         // estudiante se crea sin curso
    },

    anioLectivo: {
      type: Schema.Types.ObjectId,
      ref: 'AnioLectivo',
      default: null,         // estudiante se crea sin año
    },

    // ---------------------------------------------
    // 🟦 Histórico de promociones (opcional)
    // ---------------------------------------------
    historial: [
      {
        anioLectivo: { type: Schema.Types.ObjectId, ref: 'AnioLectivo' },
        curso: { type: Schema.Types.ObjectId, ref: 'Curso' },
        estado: { type: String, enum: ['APROBADO', 'REPROBADO'], default: 'APROBADO' },
        fecha: { type: Date, default: Date.now },
      },
    ],

    // Activo / retirado
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// expose uid en lugar de _id
EstudianteSchema.methods.toJSON = function () {
  const { __v, _id, ...est } = this.toObject();
  est.uid = _id;
  return est;
};

module.exports = model('Estudiante', EstudianteSchema);

