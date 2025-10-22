// backend-app/utils/errorResponse.js

/**
 * Clase para manejar errores personalizados en el API.
 * Permite retornar un mensaje de error y un código de estado HTTP específico.
 * @param {string} message Mensaje de error para el cliente.
 * @param {number} statusCode Código de estado HTTP (ej: 404, 401, 500).
 */
class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

module.exports = ErrorResponse;