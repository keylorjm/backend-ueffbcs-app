// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario'); 
const asyncHandler = require('./asyncHandler'); // Asumimos que está en ./

// Middleware principal para verificar el JWT
// middleware/authMiddleware.js
exports.authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, error: 'No autenticado. Falta token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id).select('_id nombre rol email').lean();
    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Usuario no encontrado.' });
    }

    // 👇 Guarda en ambos para compatibilidad
    req.usuario = {
      id: usuario._id,
      rol: usuario.rol,
      cedula: usuario.cedula,
      nombre: usuario.nombre,
      email: usuario.email,
    };
    req.user = req.usuario; // 👈 compatibilidad con middlewares que usan req.user

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token inválido o expirado.' });
  }
});

// Mantén checkRole leyendo de req.usuario (ya funcionaba)
exports.checkRole = (roles) => (req, res, next) => {
  if (!req.usuario || !roles.includes(req.usuario.rol)) {
    return res.status(403).json({
      success: false,
      error: `Acceso denegado. Rol (${req.usuario?.rol || 'No logueado'}) sin permisos.`,
    });
  }
  next();
};
