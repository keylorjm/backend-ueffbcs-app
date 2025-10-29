const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/controladorCalificacion');

router.get('/', authMiddleware, checkRole(['admin','profesor']), ctrl.getNotas);
router.post('/bulk-trimestre', authMiddleware, checkRole(['admin','profesor']), ctrl.bulkTrimestre);

module.exports = router;
