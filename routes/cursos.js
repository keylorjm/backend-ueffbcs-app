// routes/curso.js
const express = require('express');
const router = express.Router();

const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const cursoController = require('../controllers/controladorCurso');

// =============================================
// 🔹 RUTAS PÚBLICAS O SEMI-PÚBLICAS
// =============================================

// Listar todos los cursos (Admin o Profesor pueden verlos)
router.get('/', authMiddleware, checkRole(['admin', 'profesor']), cursoController.getAllCursos);

// Obtener un curso por ID (con populate completo)
router.get('/:id', authMiddleware, checkRole(['admin', 'profesor']), cursoController.getOneById);

// =============================================
// 🔹 RUTAS PROTEGIDAS PARA ADMIN / PROFESOR
// =============================================

// Crear curso (solo Admin)
router.post(
  '/',
  authMiddleware,
  checkRole(['admin']),
  cursoController.createCurso
);

// Actualizar curso (solo Admin)
router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin']),
  cursoController.updateCurso
);

// Eliminar curso (solo Admin)
router.delete(
  '/:id',
  authMiddleware,
  checkRole(['admin']),
  cursoController.deleteCurso
);

module.exports = router;

