// controllers/profesor.controller.js
const Curso = require("../models/Curso");

/**
 * GET /api/profesor/mis-cursos-materias
 * Devuelve todos los cursos y materias asignadas al profesor autenticado.
 */
const misCursosMaterias = async (req, res, next) => {
  try {
    const profesorId = req.user.id; // obtenido desde el token del authMiddleware

    // Busca cursos donde el profesor esté asignado a alguna materia
    const cursos = await Curso.find({ "materias.profesor": profesorId })
      .select("nombre anioLectivo materias")
      .populate("anioLectivo", "nombre")
      .populate("materias.materia", "nombre descripcion")
      .populate("materias.profesor", "nombre correo")
      .lean();

    if (!cursos.length) {
      return res.status(200).json({
        ok: true,
        cursos: [],
        msg: "No tienes cursos asignados actualmente.",
      });
    }

    // Construimos la respuesta simplificada
    const resultado = cursos.map((c) => ({
      cursoId: c._id,
      cursoNombre: c.nombre,
      anioLectivo: c.anioLectivo?.nombre,
      materiasAsignadas: c.materias
        .filter((m) => String(m.profesor?._id) === String(profesorId))
        .map((m) => ({
          materiaId: m.materia?._id,
          materiaNombre: m.materia?.nombre,
          descripcion: m.materia?.descripcion,
        })),
    }));

    res.json({ ok: true, cursos: resultado });
  } catch (err) {
    console.error("Error en misCursosMaterias:", err);
    next(err);
  }
};

module.exports = { misCursosMaterias };
