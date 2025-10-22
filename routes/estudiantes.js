// routes/estudiantes.js (MODIFICADO)

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middleware/validar-campos'); 
const { obtenerEstudiantes, crearEstudiante, actualizarEstudiante, eliminarEstudiante } = require('../controllers/controladorEstudiante');

const router = Router();

// GET - Obtener todos los estudiantes (estado: true)
router.get('/', obtenerEstudiantes);

// POST - Crear nuevo estudiante
router.post('/', [
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    // 🛑 Eliminamos la validación de password
    check('email', 'El correo no es válido').isEmail(),
    validarCampos 
], crearEstudiante);

// PUT - Actualizar estudiante
router.put('/:id', [
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], actualizarEstudiante);

// DELETE - Eliminar estudiante (lógica)
router.delete('/:id', [
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], eliminarEstudiante);

module.exports = router;