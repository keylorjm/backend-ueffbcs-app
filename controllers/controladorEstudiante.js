// controllers/controladorEstudiante.js
const { request, response } = require('express');
const mongoose = require('mongoose');
const Estudiante = require('../models/Estudiante');
const XLSX = require('xlsx');

const { Types } = mongoose;

// Helpers
const isCedula = (s) => /^\d{8,13}$/.test(String(s || '').trim());
const emailValido = (s) =>
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(String(s || '').toLowerCase());

// -------------------------------------------------------------
// 1) OBTENER TODOS
//    Soporta ?buscar=   y paginación ?limite=&desde=
//    Si limite=0 o ausente => sin límite
//    (Por ahora no filtramos por "activo", pero se puede agregar luego)
// -------------------------------------------------------------
const obtenerEstudiantes = async (req = request, res = response) => {
  try {
    const qBuscar = (req.query.buscar || '').trim();
    const qLimite = Number(req.query.limite);
    const qDesde = Number(req.query.desde);

    const limite = isNaN(qLimite) ? 0 : Math.max(0, qLimite);
    const desde = isNaN(qDesde) ? 0 : Math.max(0, qDesde);

    let filtro = {};
    if (qBuscar) {
      const rx = new RegExp(qBuscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filtro = { $or: [{ nombre: rx }, { cedula: rx }, { email: rx }] };
    }

    let cursor = Estudiante.find(filtro).sort({ _id: -1 }).skip(desde);
    if (limite > 0) cursor = cursor.limit(limite);

    const [total, estudiantes] = await Promise.all([
      Estudiante.countDocuments(filtro),
      cursor,
    ]);

    return res.json({ ok: true, total, estudiantes });
  } catch (error) {
    console.error('[GET /estudiantes] error:', error);
    return res
      .status(500)
      .json({ ok: false, msg: 'Error al obtener los estudiantes.' });
  }
};

// -------------------------------------------------------------
// 2) CREAR (valida duplicados por cédula y email)
//    🔹 NO exige curso ni año lectivo (se crean "sin matrícula")
//    🔹 Si vienen curso/anioLectivo válidos en el body, se asignan.
// -------------------------------------------------------------
const crearEstudiante = async (req = request, res = response) => {
  const { nombre, email, cedula, celular, curso, anioLectivo } = req.body;

  try {
    if (!nombre)
      return res
        .status(400)
        .json({ ok: false, msg: 'El nombre es obligatorio' });

    if (!isCedula(cedula)) {
      return res.status(400).json({
        ok: false,
        msg: 'Número de cédula inválido (8–13 dígitos)',
      });
    }

    if (!emailValido(email))
      return res.status(400).json({ ok: false, msg: 'Correo inválido' });

    if (!celular)
      return res
        .status(400)
        .json({ ok: false, msg: 'El celular es obligatorio' });

    // Unicidad
    const cedDup = await Estudiante.findOne({ cedula }).lean();
    if (cedDup)
      return res
        .status(400)
        .json({ ok: false, msg: 'Número de cédula ya registrado' });

    const emailLower = String(email).trim().toLowerCase();
    const emailDup = await Estudiante.findOne({ email: emailLower }).lean();
    if (emailDup)
      return res
        .status(400)
        .json({ ok: false, msg: 'Correo ya registrado' });

    const nuevo = {
      nombre: String(nombre).trim(),
      email: emailLower,
      cedula: String(cedula).trim(),
      celular: String(celular).trim(),
      // curso y anioLectivo son opcionales → se pueden setear si vienen válidos:
      curso: null,
      anioLectivo: null,
    };

    if (curso && Types.ObjectId.isValid(curso)) {
      nuevo.curso = curso;
    }
    if (anioLectivo && Types.ObjectId.isValid(anioLectivo)) {
      nuevo.anioLectivo = anioLectivo;
    }

    const estudiante = await Estudiante.create(nuevo);

    res.status(201).json({ ok: true, estudiante });
  } catch (error) {
    if (error?.code === 11000) {
      const campo = Object.keys(error.keyPattern || {})[0] || 'campo';
      const msg =
        campo === 'cedula'
          ? 'Número de cédula ya registrado'
          : campo === 'email'
          ? 'Correo ya registrado'
          : `Duplicado: ${campo}`;
      return res.status(400).json({ ok: false, msg });
    }
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: 'Hable con el administrador. Error al crear el estudiante.',
    });
  }
};

// -------------------------------------------------------------
// 3) ACTUALIZAR (valida duplicados en otros)
//    🔹 Permite actualizar curso/anioLectivo opcionalmente.
// -------------------------------------------------------------
const actualizarEstudiante = async (req = request, res = response) => {
  const { id } = req.params;
  const { _id, ...resto } = req.body;

  try {
    const estudiante = await Estudiante.findById(id);
    if (!estudiante) {
      return res.status(404).json({
        ok: false,
        msg: 'Estudiante no encontrado para actualizar.',
      });
    }

    const nextNombre = resto.nombre?.trim();
    const nextCedula = resto.cedula?.trim();
    const nextEmail = resto.email?.trim()?.toLowerCase();
    const nextCelular = resto.celular?.trim();
    const nextCurso = resto.curso;
    const nextAnioLectivo = resto.anioLectivo;

    if (nextCedula !== undefined) {
      if (!isCedula(nextCedula)) {
        return res.status(400).json({
          ok: false,
          msg: 'Número de cédula inválido (8–13 dígitos)',
        });
      }
      const clashCed = await Estudiante.findOne({
        cedula: nextCedula,
        _id: { $ne: id },
      }).lean();
      if (clashCed)
        return res
          .status(400)
          .json({ ok: false, msg: 'Número de cédula ya registrado' });
      estudiante.cedula = nextCedula;
    }

    if (nextEmail !== undefined) {
      if (!emailValido(nextEmail)) {
        return res.status(400).json({ ok: false, msg: 'Correo inválido' });
      }
      const clashEmail = await Estudiante.findOne({
        email: nextEmail,
        _id: { $ne: id },
      }).lean();
      if (clashEmail)
        return res
          .status(400)
          .json({ ok: false, msg: 'Correo ya registrado' });
      estudiante.email = nextEmail;
    }

    if (nextNombre !== undefined) estudiante.nombre = nextNombre;
    if (nextCelular !== undefined) estudiante.celular = nextCelular;

    // 🔹 Actualizar curso (opcional)
    if (nextCurso !== undefined) {
      if (nextCurso === null || nextCurso === '') {
        estudiante.curso = null;
      } else if (!Types.ObjectId.isValid(nextCurso)) {
        return res
          .status(400)
          .json({ ok: false, msg: 'curso inválido (ObjectId requerido)' });
      } else {
        estudiante.curso = nextCurso;
      }
    }

    // 🔹 Actualizar año lectivo (opcional)
    if (nextAnioLectivo !== undefined) {
      if (nextAnioLectivo === null || nextAnioLectivo === '') {
        estudiante.anioLectivo = null;
      } else if (!Types.ObjectId.isValid(nextAnioLectivo)) {
        return res.status(400).json({
          ok: false,
          msg: 'anioLectivo inválido (ObjectId requerido)',
        });
      } else {
        estudiante.anioLectivo = nextAnioLectivo;
      }
    }

    await estudiante.save();
    res.json({ ok: true, estudiante });
  } catch (error) {
    if (error?.code === 11000) {
      const campo = Object.keys(error.keyPattern || {})[0] || 'campo';
      const msg =
        campo === 'cedula'
          ? 'Número de cédula ya registrado'
          : campo === 'email'
          ? 'Correo ya registrado'
          : `Duplicado: ${campo}`;
      return res.status(400).json({ ok: false, msg });
    }
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: 'Hable con el administrador. Error al actualizar el estudiante.',
    });
  }
};

// -------------------------------------------------------------
// 4) ELIMINAR (hard delete, por ahora)
//    Luego si quieres podemos cambiar a "soft delete" usando campo activo.
// -------------------------------------------------------------
const eliminarEstudiante = async (req = request, res = response) => {
  const { id } = req.params;
  try {
    const eliminado = await Estudiante.findByIdAndDelete(id);
    if (!eliminado) {
      return res.status(404).json({
        ok: false,
        msg: 'Estudiante no encontrado para eliminar.',
      });
    }
    res.json({ ok: true, msg: 'Estudiante eliminado definitivamente.' });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ ok: false, msg: 'Error al eliminar el estudiante.' });
  }
};

// -------------------------------------------------------------
// 5) IMPORTAR DESDE EXCEL
//    🔹 NO pide curso ni año lectivo.
//    🔹 Crea estudiantes "en blanco" de matrícula (curso/anioLectivo = null).
//    🔹 Si cédula/email ya existen → los salta (skipped) para no reventar.
// -------------------------------------------------------------
const importarEstudiantesExcel = async (req = request, res = response) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ ok: false, message: 'Falta archivo (field: file)' });
    }

    const dryRun = String(req.query.dryRun || 'false') === 'true';

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) {
      return res
        .status(400)
        .json({ ok: false, message: 'El Excel no contiene hojas' });
    }

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

    const summary = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };
    const detail = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowN = i + 2; // asumiendo encabezado en fila 1

      const norm = {};
      for (const k of Object.keys(raw))
        norm[String(k).trim().toLowerCase()] = raw[k];

      const nombre = String(
        norm.nombre || norm.nombres || ''
      ).trim();
      const cedula = String(
        norm.cedula || norm.dni || ''
      ).trim();
      const celular = String(
        norm.celular || norm.telefono || ''
      ).trim();
      const email = String(
        norm.email || norm.correo || ''
      )
        .trim()
        .toLowerCase();

      if (
        !nombre ||
        !cedula ||
        !celular ||
        !email ||
        !isCedula(cedula) ||
        !emailValido(email)
      ) {
        summary.errors++;
        detail.push({
          row: rowN,
          status: 'error',
          error: 'Campos incompletos o inválidos',
          cedula,
          email,
        });
        continue;
      }

      // DUPLICADOS -> SALTAR (no revienta)
      const byCed = await Estudiante.findOne({ cedula }).lean();
      if (byCed) {
        summary.skipped++;
        detail.push({
          row: rowN,
          status: 'skipped',
          cedula,
          email,
          reason: 'Cédula ya existe',
        });
        continue;
      }
      const byEmail = await Estudiante.findOne({ email }).lean();
      if (byEmail) {
        summary.skipped++;
        detail.push({
          row: rowN,
          status: 'skipped',
          cedula,
          email,
          reason: 'Email ya existe',
        });
        continue;
      }

      if (!dryRun) {
        await Estudiante.create({
          nombre,
          cedula,
          celular,
          email,
          curso: null,       // 🔹 sin matrícula
          anioLectivo: null, // 🔹 sin matrícula
        });
      }
      summary.created++;
      detail.push({ row: rowN, status: 'created', cedula, email });
    }

    res.json({ ok: true, summary, rows: detail, dryRun });
  } catch (error) {
    console.error('Error importando estudiantes:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al importar estudiantes.',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerEstudiantes,
  crearEstudiante,
  actualizarEstudiante,
  eliminarEstudiante,
  importarEstudiantesExcel,
};
