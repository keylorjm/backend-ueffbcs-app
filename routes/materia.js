const { Router } = require('express');
const { check } = require('express-validator');
// Asegúrate de que esta ruta a tu middleware es correcta
const { validarCampos } = require('../middleware/validar-campos'); 
const { 
    obtenerMaterias, 
    crearMateria, 
    actualizarMateria, 
    eliminarMateria 
} = require('../controllers/controladorMateria'); // Asegúrate de que la ruta es correcta

const router = Router();

// ===========================================
// RUTAS: /api/materias
// ===========================================

// 1. GET - Obtener todas las materias (http://localhost:5000/api/materias)
// Nota: El backend ya incluye el .populate('profesor')
router.get('/', obtenerMaterias);

// 2. POST - Crear nueva materia (http://localhost:5000/api/materias)
router.post('/', [
    check('nombre', 'El nombre de la materia es obligatorio').not().isEmpty(),
    check('descripcion', 'La descripción es obligatoria').not().isEmpty(),
    // 🛑 CRÍTICO: El profesor debe ser un ID de Mongo válido (el UID del usuario/profesor)
    check('profesor', 'El ID del profesor es obligatorio y debe ser un ID de Mongo válido').isMongoId(), 
    validarCampos // Ejecuta la validación de campos
], crearMateria);

// 3. PUT - Actualizar materia (http://localhost:5000/api/materias/:id)
router.put('/:id', [
    check('id', 'El ID de la materia no es válido').isMongoId(),
    // Opcional: Si se envía el profesor, debe ser válido.
    check('profesor', 'El ID del profesor no es un ID de Mongo válido').optional().isMongoId(), 
    validarCampos
], actualizarMateria);

// 4. DELETE - Eliminar materia lógico (http://localhost:5000/api/materias/:id)
router.delete('/:id', [
    check('id', 'El ID de la materia no es válido').isMongoId(),
    validarCampos
], eliminarMateria);

module.exports = router;