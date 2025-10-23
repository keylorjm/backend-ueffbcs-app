const Usuario = require('../models/Usuario');
Usuario.collection.createIndex({ cedula: 1 }, { unique: true });
Usuario.collection.createIndex({ correo: 1 }, { unique: true });
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler'); 
const { request, response } = require('express');

const XLSX = require('xlsx');

// Helpers
const ROLES = new Set(['profesor', 'admin']);
const emailValido = (s) =>
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(String(s || '').toLowerCase());
const isCedula = (s) => /^\d{8,13}$/.test(String(s || '').trim());

// -------------------------------------------------------------------
// PERFIL
// -------------------------------------------------------------------
exports.getPerfil = asyncHandler(async (req = request, res = response, next) => {
  const usuario = await Usuario.findById(req.usuario?.id || req.user?.id).select('-clave');
  if (!usuario) return next(new ErrorResponse('Usuario logueado no encontrado', 404));

  res.status(200).json({ ok: true, usuario });
});

// -------------------------------------------------------------------
// PROFESORES (solo nombre/correo; añade cedula si quieres mostrarla)
// -------------------------------------------------------------------
exports.getUsuariosPorRolProfesor = asyncHandler(async (req = request, res = response) => {
  const profesores = await Usuario.find({ rol: 'profesor' }).select('nombre correo cedula');
  res.status(200).json({ ok: true, total: profesores.length, usuarios: profesores });
});

// -------------------------------------------------------------------
// LISTAR TODOS
// -------------------------------------------------------------------
exports.getUsuarios = asyncHandler(async (req = request, res = response) => {
  const usuarios = await Usuario.find(); 
  res.status(200).json({ ok: true, total: usuarios.length, usuarios });
});

// -------------------------------------------------------------------
// OBTENER UNO
// -------------------------------------------------------------------
exports.getUsuario = asyncHandler(async (req, res, next) => {
  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) return next(new ErrorResponse(`Usuario no encontrado con id ${req.params.id}`, 404));
  res.status(200).json({ ok: true, usuario });
});

// -------------------------------------------------------------------
// CREAR (valida cédula/correo únicos y requisitos)
// -------------------------------------------------------------------
exports.crearUsuario = asyncHandler(async (req, res, next) => {
  // Limpia campos no editables
  const { _id, fechaCreacion, resetPasswordToken, resetPasswordExpire, ...body } = req.body;

  const nombre = String(body.nombre || '').trim();
  const cedula = String(body.cedula || '').trim();
  const correo = String((body.correo || body.email || '')).trim().toLowerCase();
  const rolRaw = String(body.rol || 'profesor').toLowerCase();
  const rol = ROLES.has(rolRaw) ? rolRaw : 'profesor';
  const clave = String(body.clave || '').trim();

  if (!nombre) return next(new ErrorResponse('El nombre es obligatorio', 400));
  if (!isCedula(cedula)) return next(new ErrorResponse('Cédula inválida (8–13 dígitos)', 400));
  if (!emailValido(correo)) return next(new ErrorResponse('Correo inválido', 400));
  if (!clave || clave.length < 6) return next(new ErrorResponse('La clave debe tener al menos 6 caracteres', 400));

  // Unicidad
  const clashCedula = await Usuario.findOne({ cedula }).lean();
  if (clashCedula) return next(new ErrorResponse('La cédula ya está registrada', 400));

  const clashCorreo = await Usuario.findOne({ correo }).lean();
  if (clashCorreo) return next(new ErrorResponse('El correo ya está registrado', 400));

  const usuario = new Usuario({ nombre, cedula, correo, clave, rol });
  await usuario.save(); // pre('save') hashea la clave

  res.status(201).json({ ok: true, usuario });
});

// -------------------------------------------------------------------
// ACTUALIZAR (bloquea duplicados y hashea si cambia clave)
// -------------------------------------------------------------------
exports.actualizarUsuario = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { _id, fechaCreacion, resetPasswordToken, resetPasswordExpire, ...body } = req.body;

  const usuario = await Usuario.findById(id);
  if (!usuario) return next(new ErrorResponse(`Usuario no encontrado con id ${id}`, 404));

  const nextNombre = body.nombre?.trim();
  const nextCedula = body.cedula?.trim();
  const nextCorreo = body.correo?.trim()?.toLowerCase();
  const nextRolRaw = body.rol?.toLowerCase();
  const nextRol = nextRolRaw && ROLES.has(nextRolRaw) ? nextRolRaw : undefined;
  const nextClave = body.clave?.trim();

  // Validaciones y unicidad
  if (nextCedula !== undefined) {
    if (!isCedula(nextCedula)) return next(new ErrorResponse('Cédula inválida (8–13 dígitos)', 400));
    const clashCedula = await Usuario.findOne({ cedula: nextCedula, _id: { $ne: id } }).lean();
    if (clashCedula) return next(new ErrorResponse('La cédula ya está registrada', 400));
    usuario.cedula = nextCedula;
  }

  if (nextCorreo !== undefined) {
    if (!emailValido(nextCorreo)) return next(new ErrorResponse('Correo inválido', 400));
    const clashCorreo = await Usuario.findOne({ correo: nextCorreo, _id: { $ne: id } }).lean();
    if (clashCorreo) return next(new ErrorResponse('El correo ya está registrado', 400));
    usuario.correo = nextCorreo;
  }

  if (nextNombre !== undefined) usuario.nombre = nextNombre;
  if (nextRol !== undefined) usuario.rol = nextRol;

  // Si viene clave válida, asignar (pre('save') hará el hash)
  if (nextClave && nextClave.length >= 6) {
    usuario.clave = nextClave;
  }

  await usuario.save();
  res.status(200).json({ ok: true, usuario });
});

// -------------------------------------------------------------------
// ELIMINAR (físico; cambia a lógico si prefieres)
// -------------------------------------------------------------------
exports.eliminarUsuario = asyncHandler(async (req, res, next) => {
  const usuario = await Usuario.findByIdAndDelete(req.params.id);
  if (!usuario) return next(new ErrorResponse(`Usuario no encontrado con id ${req.params.id}`, 404));
  res.status(200).json({ ok: true, msg: 'Usuario eliminado correctamente' });
});

// -------------------------------------------------------------------
// IMPORTAR EXCEL (NO DUPLICAR CÉDULA/EMAIL; no actualiza)
// -------------------------------------------------------------------
exports.importUsuariosExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, message: 'Falta archivo (field: file)' });

    const dryRun = String(req.query.dryRun || 'false') === 'true';
    // allowUpdate se ignora a propósito: no queremos actualizar si hay coincidencia
    // const allowUpdate = String(req.query.allowUpdate || 'true') === 'true';

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.SheetNames?.[0];
    if (!sheet) return res.status(400).json({ ok: false, message: 'El Excel no tiene hojas' });

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' });

    const summary = { total: rows.length, created: 0, skipped: 0, errors: 0 };
    const detail = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowN = i + 2;

      // normalizar keys
      const norm = {};
      for (const k of Object.keys(raw)) norm[String(k).trim().toLowerCase()] = raw[k];

      const nombre = String(norm.nombre || norm.nombres || '').trim();
      const cedula = String(norm.cedula || norm.ci || norm.dni || '').trim();
      const correo = String(norm.correo || norm.email || '').trim().toLowerCase();
      const clave  = String(norm.clave  || norm.password || '').trim();
      const rolRaw = String(norm.rol || 'profesor').trim().toLowerCase();
      const rol = ROLES.has(rolRaw) ? rolRaw : 'profesor';

      // Validaciones mínimas
      if (!nombre || !isCedula(cedula) || !emailValido(correo)) {
        summary.errors++; detail.push({ row: rowN, status: 'error', error: 'Campos inválidos o incompletos', cedula, correo }); continue;
      }

      // Si la cédula ya existe → SKIP
      const byCedula = await Usuario.findOne({ cedula }).lean();
      if (byCedula) {
        summary.skipped++; detail.push({ row: rowN, status: 'skipped', cedula, correo, reason: 'Cédula ya existe' });
        continue;
      }

      // Si el correo ya existe → SKIP
      const byCorreo = await Usuario.findOne({ correo }).lean();
      if (byCorreo) {
        summary.skipped++; detail.push({ row: rowN, status: 'skipped', cedula, correo, reason: 'Correo ya existe' });
        continue;
      }

      // Crear (clave obligatoria)
      if (!clave || clave.length < 6) {
        summary.errors++; detail.push({ row: rowN, status: 'error', cedula, correo, error: 'Falta clave o es muy corta' });
        continue;
      }

      if (!dryRun) {
        const user = new Usuario({ nombre, cedula, correo, clave, rol });
        await user.save(); // hashea
      }
      summary.created++;
      detail.push({ row: rowN, status: 'created', cedula, correo });
    }

    res.json({ ok: true, summary, rows: detail, dryRun });
  } catch (err) {
    // Errores estándar
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || 'campo único';
      return res.status(400).json({ ok: false, msg: `Duplicado: ${key}` });
    }
    console.error('Error importando usuarios:', err);
    res.status(500).json({ ok: false, message: 'Error importando usuarios', error: err.message });
  }
};
