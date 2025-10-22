// routes/calificaciones.js
const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const ensureCursoDelProfesor = require('../middleware/ensureCursoDelProfesor');
const ctrl = require('../controllers/controladorCalificacion');

router.get(
  '/',
  authMiddleware,
  checkRole(['profesor', 'admin']),
  ensureCursoDelProfesor,
  ctrl.listarPorCursoMateriaTrimestre
);

router.post(
  '/bulk-trimestre',
  authMiddleware,
  checkRole(['profesor', 'admin']),
  ensureCursoDelProfesor,
  ctrl.cargarTrimestreBulk
);

router.post(
  '/final',
  authMiddleware,
  checkRole(['profesor', 'admin']),
  ensureCursoDelProfesor,
  ctrl.cargarEvaluacionFinal
);

module.exports = router;
