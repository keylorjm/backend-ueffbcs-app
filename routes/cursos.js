// routes/cursoRoutes.js (EJEMPLO)

const express = require('express');
const router = express.Router();
// Asume que 'authMiddleware' es tu función que verifica el JWT
const { authMiddleware, checkRole } = require('../middleware/authMiddleware'); 
const cursoController = require('../controllers/controladorCurso');

router.get('/', cursoController.getAllCursos); 
router.get('/:id', cursoController.getOneById); 


// 🛑 RUTAS PROTEGIDAS (POST, PUT, DELETE): Aquí SÍ DEBE IR authMiddleware.
router.post('/', authMiddleware, checkRole(['admin', 'profesor']), cursoController.createCurso);
router.put('/:id', authMiddleware, checkRole(['admin', 'profesor']), cursoController.updateCurso);
router.delete('/:id', authMiddleware, checkRole(['admin']), cursoController.deleteCurso);

module.exports = router;

