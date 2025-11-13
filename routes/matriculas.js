// routes/matriculas.js
const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { autoMatricular, autoMatricularBulk } = require('../controllers/controladorMatricula');

// Solo admin/director (ajusta roles a tu gusto)
router.post('/auto', authMiddleware, checkRole(['admin', 'director']), autoMatricular);
router.post('/auto-bulk', authMiddleware, checkRole(['admin', 'director']), autoMatricularBulk);
router.post('/masiva', authMiddleware, checkRole(['admin', 'director']), autoMatricularBulk);
module.exports = router;
