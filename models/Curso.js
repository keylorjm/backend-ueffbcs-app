// models/Curso.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MateriaAsignadaSchema = new Schema(
  {
    materia: {
      type: Schema.Types.ObjectId,
      ref: 'Materia',
      required: [true, 'La materia es obligatoria'],
    },
    profesor: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El profesor responsable es obligatorio'],
    },
  },
  { _id: false }
);

const CursoSchema = new Schema(
  {
    nombre: { type: String, required: [true, 'El nombre es obligatorio'], trim: true },

    // 🔹 Año lectivo al que pertenece el curso
    anioLectivo: { type: Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },

    // 🔹 Tutor principal
    profesorTutor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },

    // 🔹 Orden académico (1=1ro, 2=2do, etc.)
    orden: {
      type: Number,
      min: [1, 'El orden debe ser mínimo 1'],
      default: 1,
    },

    // 🔹 Estudiantes inscritos en este curso
    estudiantes: [{ type: Schema.Types.ObjectId, ref: 'Estudiante', default: [] }],

    // 🔹 Materias y profesor responsable
    materias: {
      type: [MateriaAsignadaSchema],
      validate: {
        validator(arr) {
          if (!Array.isArray(arr)) return false;
          for (const it of arr) {
            if (!it || !it.materia || !it.profesor) return false;
          }
          const set = new Set(arr.map((x) => String(x.materia)));
          return set.size === arr.length;
        },
        message:
          'Cada materia debe tener materia y profesor válidos, y no puede repetirse la misma materia.',
      },
      default: [],
    },
  },
  { timestamps: true }
);

CursoSchema.index({ anioLectivo: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('Curso', CursoSchema);
