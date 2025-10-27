// routes/materia.js
const express = require('express');
const router = express.Router();

const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const materiaCtrl = require('../controllers/controladorMateria');
const validateObjectId = require('../middleware/validateObjectId');

// Listar / Obtener (admin o profesor)
router.get('/', authMiddleware, checkRole(['admin', 'profesor']), materiaCtrl.listar);
router.get('/:id', authMiddleware, checkRole(['admin', 'profesor']), validateObjectId('id'), materiaCtrl.obtener);

// Crear / Actualizar / Eliminar (solo admin)
router.post('/', authMiddleware, checkRole(['admin']), materiaCtrl.crear);
router.put('/:id', authMiddleware, checkRole(['admin']), validateObjectId('id'), materiaCtrl.actualizar);
router.delete('/:id', authMiddleware, checkRole(['admin']), validateObjectId('id'), materiaCtrl.eliminar);

module.exports = router;
