// routes/promocion.js
const router = require('express').Router();
const {
  promocionar,
  listarPorAnio,
} = require('../controllers/controladorPromocion');

// POST /api/promocion  → procesa promoción automática
router.post('/', promocionar);

// GET /api/promocion?anioLectivoId=... → ver historial
router.get('/', listarPorAnio);

module.exports = router;
