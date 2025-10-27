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
    anioLectivo: { type: Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },
    profesorTutor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    estudiantes: [{ type: Schema.Types.ObjectId, ref: 'Estudiante', default: [] }],
    materias: {
      type: [MateriaAsignadaSchema],
      validate: {
        validator(arr) {
          if (!Array.isArray(arr)) return false;
          for (const it of arr) {
            if (!it || !it.materia || !it.profesor) return false;
          }
          const set = new Set(arr.map((x) => String(x.materia)));
          return set.size === arr.length; // sin materias duplicadas
        },
        message: 'Cada materia debe tener materia y profesor válidos, y no puede repetirse la misma materia.',
      },
      default: [],
    },
  },
  { timestamps: true }
);

// Unicidad de nombre dentro del año lectivo
CursoSchema.index({ anioLectivo: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('Curso', CursoSchema);
