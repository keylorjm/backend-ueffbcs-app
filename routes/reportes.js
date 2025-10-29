// routes/reportes.js
const express = require('express');
const router = express.Router();

const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/controladorReporte');

router.get('/trimestral', authMiddleware, checkRole(['admin','profesor']), ctrl.reporteTrimestral);
router.get('/final',      authMiddleware, checkRole(['admin','profesor']), ctrl.reporteFinalAnual);

module.exports = router;


