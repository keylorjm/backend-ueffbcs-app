// middleware/autenticacion.js
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

exports.proteger = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } 

    if (!token) {
        return res.status(401).json({ success: false, error: 'Acceso denegado, no hay token.' });
    }

    try {
        const decodificado = jwt.verify(token, process.env.JWT_SECRETO);
        req.usuario = await Usuario.findById(decodificado.id).select('+rol'); // Aseguramos el rol
        if (!req.usuario) {
             return res.status(401).json({ success: false, error: 'Token inválido o usuario no existe.' });
        }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Token expirado o inválido.' });
    }
};

exports.autorizar = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.usuario.rol)) {
            return res.status(403).json({ 
                success: false, 
                error: `Usuario con rol ${req.usuario.rol} no tiene permisos para acceder a esta ruta.` 
            });
        }
        next();
    };
};