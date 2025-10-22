// models/Curso.js
const { Schema, model } = require("mongoose");

const CursoSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del curso es obligatorio"],
      unique: true,
    },

    // 1. Profesor Tutor (Relación 1:1)
    // El profesor tutor debe ser un usuario con rol 'profesor'
    profesorTutor: {
      type: Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El profesor tutor es obligatorio"],
    },

    // 2. Materias (Relación 1:N)
    // Un curso tiene muchas materias, se guarda un array de IDs de Materia
    materias: [
      {
        type: Schema.Types.ObjectId,
        ref: "Materia",
      },
    ],

    // 3. Estudiantes (Relación 1:N)
    // Un curso tiene muchos estudiantes, se guarda un array de IDs de Estudiante
    estudiantes: [
      {
        type: Schema.Types.ObjectId,
        ref: "Estudiante",
      },
    ],

    anioLectivo: {
      type: Schema.Types.ObjectId,
      ref: "AnioLectivo",
      required: false,
    },

    // Campo de estado para manejo de borrado lógico
    estado: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      // Renombra _id a uid en la respuesta JSON
      transform: function (doc, ret) {
        ret.uid = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = model("Curso", CursoSchema);
