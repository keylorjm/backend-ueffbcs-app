// middleware/validateObjectId.js
const { Types } = require('mongoose');

module.exports = function validateObjectId(paramName) {
  return function (req, res, next) {
    const id = req.params[paramName];
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: `El parámetro ${paramName} no es un ObjectId válido` });
    }
    next();
  };
};
