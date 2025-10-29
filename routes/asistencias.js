// routes/asistencias.js
const express = require('express');
const router = express.Router();

const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/controladorAsistencia');

// Todas requieren login (admin o profesor)
router.use(authMiddleware, checkRole(['admin', 'profesor']));

// Días laborables
router.get('/laborables', ctrl.getLaborables);
router.post('/laborables', ctrl.setLaborables);

// Faltas por estudiante
router.get('/', ctrl.listFaltas);
router.post('/bulk-faltas', ctrl.bulkFaltas);

module.exports = router;
