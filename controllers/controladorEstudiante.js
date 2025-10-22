// controllers/controladorEstudiante.js

const { request, response } = require("express");
const Estudiante = require("../models/Estudiante");

// -------------------------------------------------------------
// 1. OBTENER TODOS LOS ESTUDIANTES (GET)
// -------------------------------------------------------------
const obtenerEstudiantes = async (req = request, res = response) => {
  // Obtener parámetros de paginación/límite si se usan (aquí se usa un límite simple)
  const limite = Number(req.query.limite) || 10;
  const desde = Number(req.query.desde) || 0;

  // Buscar solo estudiantes con estado: true
  try {
    const [total, estudiantes] = await Promise.all([
      Estudiante.countDocuments({ estado: true }),
      Estudiante.find({ estado: true }).skip(desde).limit(limite),
    ]);

    res.json({
      ok: true,
      total,
      estudiantes,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener los estudiantes.",
    });
  }
};

// -------------------------------------------------------------
// 2. CREAR ESTUDIANTE (POST)
// -------------------------------------------------------------
const crearEstudiante = async (req = request, res = response) => {
  // Solo necesitamos nombre y email
  const { nombre, email, cedula, celular } = req.body;

  try {
    let estudiante = await Estudiante.findOne({ email });

    if (estudiante) {
      return res.status(400).json({
        ok: false,
        msg: `El estudiante con el correo ${email} ya existe.`,
      });
    }

    // Crear instancia del modelo
    estudiante = new Estudiante({ nombre, email, cedula, celular });

    // Guardar en DB
    await estudiante.save();

    res.status(201).json({
      ok: true,
      estudiante,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador. Error al crear el estudiante.",
    });
  }
};

// -------------------------------------------------------------
// 3. ACTUALIZAR ESTUDIANTE (PUT)
// -------------------------------------------------------------
const actualizarEstudiante = async (req = request, res = response) => {
  const { id } = req.params;
  // Evitar que se actualicen campos internos como _id o estado
  const { _id, estado, ...resto } = req.body;

  try {
    const estudiante = await Estudiante.findByIdAndUpdate(id, resto, {
      new: true,
    });

    if (!estudiante) {
      return res.status(404).json({
        ok: false,
        msg: "Estudiante no encontrado para actualizar.",
      });
    }

    res.json({
      ok: true,
      estudiante,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador. Error al actualizar el estudiante.",
    });
  }
};

// -------------------------------------------------------------
// 4. ELIMINAR ESTUDIANTE (DELETE - lógico)
// -------------------------------------------------------------
const eliminarEstudiante = async (req = request, res = response) => {
  const { id } = req.params;

  try {
    // Eliminación lógica (cambiar estado a false)
    const estudianteEliminado = await Estudiante.findByIdAndUpdate(
      id,
      { estado: false },
      { new: true }
    );

    if (!estudianteEliminado) {
      return res.status(404).json({
        ok: false,
        msg: "Estudiante no encontrado para eliminar.",
      });
    }

    res.json({
      ok: true,
      msg: "Estudiante eliminado lógicamente.",
      estudiante: estudianteEliminado,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Error al eliminar el estudiante.",
    });
  }
};

module.exports = {
  obtenerEstudiantes,
  crearEstudiante,
  actualizarEstudiante,
  eliminarEstudiante,
};
