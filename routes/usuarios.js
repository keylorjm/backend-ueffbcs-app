// archivo: router/usuarioRoutes.js

const express = require("express");
const router = express.Router();
// Asumo que tienes un middleware para validar campos.
const { validarCampos } = require("../middleware/validar-campos");

// 🛑 CORRECCIÓN: Usaremos 'authMiddleware' para proteger la ruta '/me'
const { authMiddleware, checkRole } = require("../middleware/authMiddleware");

const {
  getUsuarios,
  getUsuario,
  getUsuariosPorRolProfesor,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  getPerfil, // 🛑 AÑADIDO: Importar la función getPerfil
} = require("../controllers/controladorUsuario");

// ---------------------------------------------------
// 🛑 RUTA CRÍTICA PARA EL LOGIN DEL FRONTEND 🛑
// @route   GET /api/usuarios/me
// @access  Protegido (Usuario Logueado)
// ---------------------------------------------------
router.get(
  "/me",
  [authMiddleware], // 🛑 CORRECCIÓN: Usamos authMiddleware para validar el JWT
  getPerfil
);

// ---------------------------------------------------
// Rutas de CRUD
// ---------------------------------------------------

// /api/usuarios/profesores
router.get(
  "/profesores",
  [authMiddleware, checkRole(["admin", "profesor"]), validarCampos],
  getUsuariosPorRolProfesor
);

// /api/usuarios (Rutas generales de listado y creación)
router
  .route("/")
  .get(authMiddleware, checkRole(["admin", "profesor"]), getUsuarios)
  .post(authMiddleware, checkRole(["admin"]), crearUsuario); // C: Crear

// /api/usuarios/:id (Rutas específicas por ID)
router
  .route("/:id")
  .get(authMiddleware, checkRole(["admin"]), getUsuario) // R: Leer Uno
  .put(authMiddleware, checkRole(["admin"]), actualizarUsuario) // U: Actualizar
  .delete(authMiddleware, checkRole(["admin"]), eliminarUsuario); // D: Eliminar

module.exports = router;
