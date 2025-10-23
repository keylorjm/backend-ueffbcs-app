// controllers/controladorReporte.js
const mongoose = require("mongoose");
const Calificacion = require("../models/Calificacion");
const Curso = require("../models/Curso");
const Estudiante = require("../models/Estudiante");
const AnioLectivo = require("../models/AnioLectivo");
const Materia = require("../models/Materia");
const ErrorResponse = require("../utils/errorResponse");

const isOid = (id) => typeof id === "string" && mongoose.isValidObjectId(id);
const isTri = (t) => ["T1", "T2", "T3"].includes(String(t || "").toUpperCase());

/**
 * -----------------------------------------------------
 * 📘 GET /api/reportes/trimestre
 * Parámetros: cursoId, anioLectivoId, materiaId, trimestre
 * Devuelve las notas de los estudiantes en esa materia y trimestre.
 * -----------------------------------------------------
 */
exports.reporteTrimestral = async (req, res, next) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre } = req.query;

    if (!isOid(cursoId)) return next(new ErrorResponse("cursoId inválido", 400));
    if (!isOid(anioLectivoId))
      return next(new ErrorResponse("anioLectivoId inválido", 400));
    if (!isOid(materiaId))
      return next(new ErrorResponse("materiaId inválido", 400));
    if (!isTri(trimestre))
      return next(new ErrorResponse("trimestre debe ser T1|T2|T3", 400));

    const tri = String(trimestre).toUpperCase();

    const curso = await Curso.findById(cursoId)
      .populate("profesorTutor", "nombre apellido correo")
      .populate("materias", "nombre")
      .lean();
    const materia = await Materia.findById(materiaId)
      .populate("profesor", "nombre apellido correo")
      .lean();
    const anio = await AnioLectivo.findById(anioLectivoId).lean();

    if (!curso || !materia || !anio) {
      return next(new ErrorResponse("Datos del curso o materia no encontrados", 404));
    }

    const rows = await Calificacion.find({
      curso: cursoId,
      materia: materiaId,
      anioLectivo: anioLectivoId,
    })
      .populate("estudiante", "nombre apellido cedula")
      .lean();

    const data = rows.map((r) => ({
      estudiante: r.estudiante,
      promedioTrimestral: r[tri]?.promedioTrimestral ?? null,
      faltasJustificadas: r[tri]?.faltasJustificadas ?? 0,
      faltasInjustificadas: r[tri]?.faltasInjustificadas ?? 0,
      asistenciaTotal: r[tri]?.asistenciaTotal ?? 0,
    }));

    res.status(200).json({
      ok: true,
      header: {
        curso,
        materia,
        anioLectivo: anio,
        trimestre: tri,
        tutor: curso.profesorTutor,
        profesor: materia.profesor,
        totalEstudiantes: data.length,
      },
      rows: data,
    });
  } catch (err) {
    console.error("[Reporte trimestral error]", err);
    next(err);
  }
};

/**
 * -----------------------------------------------------
 * 📘 GET /api/reportes/final
 * Parámetros: cursoId, anioLectivoId, estudianteId
 * Devuelve TODAS las materias cursadas con los tres trimestres y promedio final.
 * -----------------------------------------------------
 */
exports.reporteFinal = async (req, res, next) => {
  try {
    const { cursoId, anioLectivoId, estudianteId } = req.query;

    if (!isOid(cursoId)) return next(new ErrorResponse("cursoId inválido", 400));
    if (!isOid(anioLectivoId))
      return next(new ErrorResponse("anioLectivoId inválido", 400));
    if (!isOid(estudianteId))
      return next(new ErrorResponse("estudianteId inválido", 400));

    const curso = await Curso.findById(cursoId)
      .populate("profesorTutor", "nombre apellido correo")
      .populate("materias", "nombre")
      .lean();
    const estudiante = await Estudiante.findById(estudianteId).lean();
    const anio = await AnioLectivo.findById(anioLectivoId).lean();

    if (!curso || !estudiante || !anio)
      return next(new ErrorResponse("Datos de encabezado no encontrados", 404));

    const califs = await Calificacion.find({
      curso: cursoId,
      anioLectivo: anioLectivoId,
      estudiante: estudianteId,
    })
      .populate("materia", "nombre profesor")
      .populate({
        path: "materia.profesor",
        select: "nombre apellido",
      })
      .lean();

    const rows = califs.map((c) => {
      const T1 = c?.T1?.promedioTrimestral ?? null;
      const T2 = c?.T2?.promedioTrimestral ?? null;
      const T3 = c?.T3?.promedioTrimestral ?? null;
      const notaFinal = c?.notaPromocion ?? c?.promedioTrimestralAnual ?? null;
      return {
        materia: c.materia,
        T1,
        T2,
        T3,
        notaFinal,
      };
    });

    const promedioGeneral =
      rows.length > 0
        ? (
            rows.reduce((acc, r) => acc + (r.notaFinal || 0), 0) / rows.length
          ).toFixed(2)
        : 0;

    // Calcular faltas totales y asistencia global
    const califsAsistencia = await Calificacion.find({
      curso: cursoId,
      anioLectivo: anioLectivoId,
      estudiante: estudianteId,
    }).lean();

    let T1FJ = 0,
      T1FI = 0,
      T2FJ = 0,
      T2FI = 0,
      T3FJ = 0,
      T3FI = 0,
      diasAsistidos = 0;

    califsAsistencia.forEach((c) => {
      T1FJ += c?.T1?.faltasJustificadas || 0;
      T1FI += c?.T1?.faltasInjustificadas || 0;
      T2FJ += c?.T2?.faltasJustificadas || 0;
      T2FI += c?.T2?.faltasInjustificadas || 0;
      T3FJ += c?.T3?.faltasJustificadas || 0;
      T3FI += c?.T3?.faltasInjustificadas || 0;
      diasAsistidos +=
        (c?.T1?.asistenciaTotal || 0) +
        (c?.T2?.asistenciaTotal || 0) +
        (c?.T3?.asistenciaTotal || 0);
    });

    res.status(200).json({
      ok: true,
      header: {
        curso,
        anioLectivo: anio,
        estudiante,
        tutor: curso.profesorTutor,
        asistencia: {
          T1FJ,
          T1FI,
          T2FJ,
          T2FI,
          T3FJ,
          T3FI,
          diasAsistidos,
        },
      },
      rows,
      promedioGeneral,
    });
  } catch (err) {
    console.error("[Reporte final error]", err);
    next(err);
  }
};
