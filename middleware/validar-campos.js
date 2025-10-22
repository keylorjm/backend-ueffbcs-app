const { response } = require('express');
const { validationResult } = require('express-validator');

const validarCampos = (req, res = response, next) => {
    
    // Captura los errores de validación de express-validator
    const errores = validationResult(req); 

    if (!errores.isEmpty()) {
        return res.status(400).json({
            ok: false,
            errors: errores.mapped()
        });
    }

    next(); // Si no hay errores, pasa al siguiente middleware/controlador
}

module.exports = {
    validarCampos // 🛑 Exportación necesaria
}