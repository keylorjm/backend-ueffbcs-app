// routes/autenticacion.js
const express = require('express');
const { 
    iniciarSesion, 
    registrarUsuario, 
    recuperarContrasena, 
    restablecerContrasena 
} = require('../controllers/controladorAutenticacion');
const router = express.Router();

router.post('/registrar', registrarUsuario); 
router.post('/iniciarSesion', iniciarSesion);

// Rutas de recuperación
router.post('/recuperarContrasena', recuperarContrasena); 
router.put('/restablecerContrasena/:resetToken', restablecerContrasena); 

module.exports = router;