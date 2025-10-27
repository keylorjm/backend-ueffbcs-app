// controllers/materia.controller.js
const { Types } = require('mongoose');
const Materia = require('../models/Materia');
const asyncHandler = require('../middleware/asyncHandler');

const isOid = (v) => typeof v === 'string' && Types.ObjectId.isValid(v);

exports.listar = asyncHandler(async (_req, res) => {
  const materias = await Materia.find()
    .populate('profesor', 'nombre correo')
    .lean();
  res.json({ ok: true, materias });
});

exports.obtener = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isOid(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

  const materia = await Materia.findById(id)
    .populate('profesor', 'nombre correo');

  if (!materia) return res.status(404).json({ ok: false, message: 'Materia no encontrada' });
  res.json({ ok: true, materia });
});

exports.crear = asyncHandler(async (req, res) => {
  const { nombre, descripcion = '', profesor } = req.body;

  if (!nombre || !String(nombre).trim())
    return res.status(400).json({ ok: false, message: 'El nombre es obligatorio' });

  if (!isOid(profesor))
    return res.status(400).json({ ok: false, message: 'profesor inválido' });

  try {
    const created = await Materia.create({
      nombre: String(nombre).trim(),
      descripcion: String(descripcion || ''),
      profesor,
    });

    const materia = await Materia.findById(created._id)
      .populate('profesor', 'nombre correo');

    res.status(201).json({ ok: true, materia });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Ya existe una materia con ese nombre' });
    }
    throw err;
  }
});

exports.actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isOid(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

  const update = {};
  if (typeof req.body.nombre === 'string' && req.body.nombre.trim())
    update.nombre = req.body.nombre.trim();

  if (typeof req.body.descripcion === 'string')
    update.descripcion = req.body.descripcion;

  if (isOid(req.body.profesor))
    update.profesor = req.body.profesor;

  try {
    const materia = await Materia.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('profesor', 'nombre correo');

    if (!materia) return res.status(404).json({ ok: false, message: 'Materia no encontrada' });
    res.json({ ok: true, materia });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Ya existe una materia con ese nombre' });
    }
    throw err;
  }
});

exports.eliminar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isOid(id)) return res.status(400).json({ ok: false, message: 'ID inválido' });

  const materia = await Materia.findByIdAndDelete(id);
  if (!materia) return res.status(404).json({ ok: false, message: 'Materia no encontrada' });

  res.json({ ok: true, message: 'Materia eliminada' });
});
