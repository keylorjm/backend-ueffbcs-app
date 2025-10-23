// middleware/error.js
module.exports = (err, req, res, next) => {
  // Duplicado Mongo (índice unique)
  if (err && err.code === 11000) {
    const campo = Object.keys(err.keyPattern || {})[0] || 'campo';
    return res.status(400).json({ ok: false, msg: `Duplicado: ${campo}` });
  }

  // ErrorResponse personalizado (si lo usas)
  if (err && err.statusCode) {
    return res.status(err.statusCode).json({ ok: false, msg: err.message });
  }

  // Mensajes que mandaste con next(new Error(...))
  if (err && err.message) {
    return res.status(400).json({ ok: false, msg: err.message });
  }

  // Fallback
  return res.status(500).json({ ok: false, msg: 'Error del servidor' });
};
