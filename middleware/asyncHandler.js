// middleware/asyncHandler.js

/**
 * Función wrapper para manejar errores en funciones asíncronas de Express.
 * Captura cualquier excepción y la pasa al manejador de errores global de Express.
 */
const asyncHandler = (fn) => (req, res, next) => {
    // Promise.resolve().catch(next) asegura que cualquier error lanzado
    // dentro de la función 'fn' sea capturado y pasado a 'next(error)'.
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;