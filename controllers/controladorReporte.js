// controllers/reportesController.js
const Calificacion = require('../models/Calificacion');
const Asistencia   = require('../models/Asistencia');

const isValidTri = (t) => ['T1','T2','T3'].includes(t);

exports.reporteTrimestral = async (req, res) => {
  try {
    const { cursoId, anioLectivoId, materiaId, trimestre } = req.query;
    if (!cursoId || !anioLectivoId || !materiaId || !isValidTri(trimestre)) {
      return res.status(400).json({ message: 'Parámetros inválidos' });
    }

    // Fetch en paralelo
    const [califs, asists] = await Promise.all([
      Calificacion.find({ curso: cursoId, anioLectivo: anioLectivoId, materia: materiaId })
        .select(`estudiante ${trimestre}.promedioTrimestral`)
        .populate('estudiante', 'nombre email')
        .lean(),
      Asistencia.find({ curso: cursoId, anioLectivo: anioLectivoId, materia: materiaId })
        .select(`estudiante ${trimestre}.faltasJustificadas ${trimestre}.faltasInjustificadas ${trimestre}.diasLaborados`)
        .lean(),
    ]);

    const idxAsist = new Map(
      asists.map(a => [String(a.estudiante), a])
    );

    const rows = califs.map(c => {
      const estId   = String(c.estudiante?._id || c.estudiante);
      const estName = c.estudiante?.nombre ?? c.estudiante?.email ?? '—';
      const nota    = c[trimestre]?.promedioTrimestral ?? null;

      const a = idxAsist.get(estId);
      const fj = a?.[trimestre]?.faltasJustificadas   ?? 0;
      const fi = a?.[trimestre]?.faltasInjustificadas ?? 0;
      const dl = a?.[trimestre]?.diasLaborados        ?? 0;
      const asistidos = Math.max(0, Number(dl) - Number(fi));

      return {
        estudianteId: estId,
        estudianteNombre: estName,
        promedioTrimestral: nota,             // 0..100
        faltasJustificadas: fj,
        faltasInjustificadas: fi,
        diasLaborados: dl,
        asistidos,                            // derivado
      };
    });

    res.json({ rows });
  } catch (err) {
    console.error('[Reportes#reporteTrimestral] error:', err);
    res.status(500).json({ message: 'Error al generar reporte trimestral' });
  }
};

exports.reporteFinalAnual = async (req, res) => {
  try {
    const { cursoId, anioLectivoId, materiaId } = req.query;
    if (!cursoId || !anioLectivoId || !materiaId) {
      return res.status(400).json({ message: 'Parámetros inválidos' });
    }

    const califs = await Calificacion.find({ curso: cursoId, anioLectivo: anioLectivoId, materia: materiaId })
      .populate('estudiante', 'nombre email')
      .lean();

    const asists = await Asistencia.find({ curso: cursoId, anioLectivo: anioLectivoId, materia: materiaId }).lean();
    const idxAsist = new Map(asists.map(a => [String(a.estudiante), a]));

    const rows = califs.map(c => {
      const estId   = String(c.estudiante?._id || c.estudiante);
      const estName = c.estudiante?.nombre ?? c.estudiante?.email ?? '—';

      const notas = [c.T1?.promedioTrimestral, c.T2?.promedioTrimestral, c.T3?.promedioTrimestral]
        .filter(n => typeof n === 'number');
      const promFinal = notas.length
        ? Math.round((notas.reduce((a,b)=>a+b,0) / notas.length) * 100) / 100
        : null;

      // Sumar faltas del año (opcional)
      const a = idxAsist.get(estId);
      const sumFJ = (a?.T1?.faltasJustificadas ?? 0) + (a?.T2?.faltasJustificadas ?? 0) + (a?.T3?.faltasJustificadas ?? 0);
      const sumFI = (a?.T1?.faltasInjustificadas ?? 0) + (a?.T2?.faltasInjustificadas ?? 0) + (a?.T3?.faltasInjustificadas ?? 0);
      const sumDL = (a?.T1?.diasLaborados ?? 0) + (a?.T2?.diasLaborados ?? 0) + (a?.T3?.diasLaborados ?? 0);
      const sumAsistidos = Math.max(0, sumDL - sumFI);

      return {
        estudianteId: estId,
        estudianteNombre: estName,
        T1: c.T1?.promedioTrimestral ?? null,
        T2: c.T2?.promedioTrimestral ?? null,
        T3: c.T3?.promedioTrimestral ?? null,
        promedioFinal: promFinal,   // 0..100
        faltasJustificadas: sumFJ,
        faltasInjustificadas: sumFI,
        diasLaborados: sumDL,
        asistidos: sumAsistidos,
      };
    });

    res.json({ rows });
  } catch (err) {
    console.error('[Reportes#reporteFinalAnual] error:', err);
    res.status(500).json({ message: 'Error al generar reporte final' });
  }
};
