// controllers/controladorAnioLectivo.js 
const mongoose = require('mongoose');
const AnioLectivo = require('../models/AnioLectivo');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Estructura esperada del modelo (referencial):
 * {
 *   nombre: String (único, requerido),
 *   fechaInicio: Date (requerido),
 *   fechaFin: Date (requerido),
 *   actual: Boolean (default: false),
 *   activo: Boolean (default: true),
 *   orden:  Number (opcional, usado para secuencia de años)
 * }
 */

// ===================== LISTAR =====================
exports.listar = async (req, res, next) => {
  try {
    // Si tu modelo tiene "activo", mostramos solo activos; si no, mostramos todo.
    const filter = {};
    if (AnioLectivo.schema.path('activo')) filter.activo = true;

    // 👇 Ordenamos por "orden" ascendente y luego por fechaInicio
    const rows = await AnioLectivo.find(filter)
      .sort({ orden: 1, fechaInicio: 1 })
      .lean();

    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ===================== OBTENER UNO =====================
exports.obtenerUno = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse('ID inválido', 400));
    }

    const doc = await AnioLectivo.findById(id).lean();
    if (!doc) {
      return next(new ErrorResponse('Año lectivo no encontrado', 404));
    }
    res.json({ ok: true, data: doc });
  } catch (err) {
    next(err);
  }
};

// ===================== OBTENER ACTUAL =====================
exports.obtenerActual = async (req, res, next) => {
  try {
    const filter = { actual: true };
    if (AnioLectivo.schema.path('activo')) filter.activo = true;

    const doc = await AnioLectivo.findOne(filter).lean();
    res.json({ ok: true, data: doc || null });
  } catch (err) {
    next(err);
  }
};

// ===================== CREAR =====================
exports.crear = async (req, res, next) => {
  try {
    const { nombre, fechaInicio, fechaFin, actual, activo, orden } = req.body || {};

    const payload = {
      nombre,
      fechaInicio,
      fechaFin,
      actual: !!actual,
    };

    // activo: si viene en el body lo usamos; si no, por defecto true
    if (AnioLectivo.schema.path('activo')) {
      payload.activo = (typeof activo === 'boolean') ? activo : true;
    }

    // 🔹 orden: si viene, lo convertimos a número; si no, lo dejamos undefined
    if (orden !== undefined && orden !== null && orden !== '') {
      payload.orden = Number(orden) || 0;
    }

    // Validaciones básicas
    if (!payload.nombre) return next(new ErrorResponse('El nombre es obligatorio', 400));
    if (!payload.fechaInicio) return next(new ErrorResponse('La fecha de inicio es obligatoria', 400));
    if (!payload.fechaFin) return next(new ErrorResponse('La fecha de fin es obligatoria', 400));

    // Si se crea "actual: true", desmarcar otros
    if (payload.actual) {
      await AnioLectivo.updateMany({ actual: true }, { $set: { actual: false } });
    }

    const created = await AnioLectivo.create(payload);
    res.status(201).json({ ok: true, data: created });
  } catch (err) {
    // Posibles errores por índice único (nombre)
    if (err?.code === 11000) {
      return next(new ErrorResponse('Ya existe un año lectivo con ese nombre', 409));
    }
    next(err);
  }
};

// ===================== ACTUALIZAR =====================
exports.actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse('ID inválido', 400));
    }

    const { nombre, fechaInicio, fechaFin, activo, orden } = req.body || {};

    const body = {
      nombre,
      fechaInicio,
      fechaFin,
    };

    // activo (si tu schema lo tiene)
    if (AnioLectivo.schema.path('activo') && typeof activo === 'boolean') {
      body.activo = activo;
    }

    // 🔹 orden (si viene del front)
    if (orden !== undefined && orden !== null && orden !== '') {
      body.orden = Number(orden) || 0;
    }

    // Limpia undefineds
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    const updated = await AnioLectivo.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return next(new ErrorResponse('Año lectivo no encontrado', 404));
    }

    res.json({ ok: true, data: updated });
  } catch (err) {
    if (err?.code === 11000) {
      return next(new ErrorResponse('Ya existe un año lectivo con ese nombre', 409));
    }
    next(err);
  }
};

// ===================== MARCAR COMO ACTUAL (sin transacción) =====================
exports.marcarComoActual = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse('ID inválido', 400));
    }

    const target = await AnioLectivo.findById(id);
    if (!target) {
      return next(new ErrorResponse('Año lectivo no encontrado', 404));
    }

    // Idempotencia: si ya es actual, responde OK
    if (target.actual === true) {
      return res.json({ ok: true, data: target });
    }

    // 1) Desmarcar todos los "actual"
    await AnioLectivo.updateMany({ actual: true }, { $set: { actual: false } });

    // 2) Marcar el seleccionado
    target.actual = true;
    await target.save();

    return res.json({ ok: true, data: target });
  } catch (err) {
    next(err);
  }
};

// ===================== ELIMINAR (soft si hay "activo"; hard si no existe ese campo) =====================
exports.eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse('ID inválido', 400));
    }

    const doc = await AnioLectivo.findById(id);
    if (!doc) {
      return next(new ErrorResponse('Año lectivo no encontrado', 404));
    }

    if (AnioLectivo.schema.path('activo')) {
      // Soft delete
      if (doc.activo === false) {
        return res.json({ ok: true, data: doc }); // ya estaba inactivo
      }
      doc.activo = false;
      await doc.save();
      return res.json({ ok: true, data: doc });
    } else {
      // Eliminación definitiva
      await AnioLectivo.deleteOne({ _id: id });
      return res.json({ ok: true, data: { _id: id } });
    }
  } catch (err) {
    next(err);
  }
};
