// models/Materia.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const MateriaSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la materia es obligatorio"],
      trim: true,
    },
    descripcion: { type: String, default: "" },
    // Profesor asignado por defecto a esta materia
    profesor: {
      type: Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "Debe asignarse un profesor a la materia"],
    },
  },
  { timestamps: true }
);

MateriaSchema.index({ nombre: 1 }, { unique: true });

module.exports = mongoose.model("Materia", MateriaSchema);
