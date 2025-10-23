// routes/profesor.js
const express = require("express");
const router = express.Router();
const { authMiddleware, checkRole } = require("../middleware/authMiddleware");
const { misCursosMaterias } = require("../controllers/controladorProfesor");

// =============================================
// RUTA: /api/profesor/mis-cursos-materias
// =============================================
// Solo para usuarios con rol "profesor"
router.get(
  "/mis-cursos-materias",
  authMiddleware,
  checkRole(["profesor"]),
  misCursosMaterias
);

module.exports = router;
