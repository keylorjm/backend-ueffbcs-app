// models/Calificacion.js
const mongoose = require('mongoose');

/* ===================== CUALITATIVA ===================== */
const BANDS = Object.freeze([
  { min: 9.5, max: 10.01, quali: 'A+' },
  { min: 9.0, max: 9.5,  quali: 'A-' },
  { min: 8.5, max: 9.0,  quali: 'B+' },
  { min: 8.0, max: 8.5,  quali: 'B-' },
  { min: 7.0, max: 8.0,  quali: 'C+' },
  { min: 6.0, max: 7.0,  quali: 'C-' },
  { min: 4.0, max: 6.0,  quali: 'D'  },
  { min: 0.0, max: 4.0,  quali: 'E'  },
]);
function cualiFromPromedio(p) {
  const v = Number(p ?? 0);
  const band = BANDS.find(b => v >= b.min && v < b.max);
  return band ? band.quali : '';
}

/* ===================== SUBESQUEMA TRIMESTRE ===================== */
const EsquemaNotaTrimestre = new mongoose.Schema({
  // Ingresados por el profesor:
  promedioTrimestral:   { type: Number, min: 0, max: 10, default: 0 },
  faltasJustificadas:   { type: Number, min: 0, default: 0 },
  faltasInjustificadas: { type: Number, min: 0, default: 0 },

  // Autogenerados:
  calificacionCualitativa: { type: String, enum: ['A+','A-','B+','B-','C+','C-','D','E',''], default: '' },
  notaCuantitativa:        { type: Number, min: 0, max: 10, default: 0 },
}, { _id: false });

/* ===================== ESQUEMA PRINCIPAL ===================== */
const EsquemaCalificacion = new mongoose.Schema({
  estudiante:  { type: mongoose.Schema.Types.ObjectId, ref: 'Estudiante',  required: true },
  curso:       { type: mongoose.Schema.Types.ObjectId, ref: 'Curso',       required: true },
  anioLectivo: { type: mongoose.Schema.Types.ObjectId, ref: 'AnioLectivo', required: true },
  materia:     { type: mongoose.Schema.Types.ObjectId, ref: 'Materia',     required: true },

  T1: { type: EsquemaNotaTrimestre, default: () => ({}) },
  T2: { type: EsquemaNotaTrimestre, default: () => ({}) },
  T3: { type: EsquemaNotaTrimestre, default: () => ({}) },

  promedioTrimestralAnual: { type: Number, min: 0, max: 10, default: 0 },
  evaluacionFinal:         { type: Number, min: 0, max: 10, default: 0 },
  notaPromocion:           { type: Number, min: 0, max: 10, default: 0 },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

/* Índice único por estudiante-curso-materia-año (evita duplicados por año) */
EsquemaCalificacion.index(
  { estudiante: 1, curso: 1, materia: 1, anioLectivo: 1 },
  {
    unique: true,
    partialFilterExpression: {
      estudiante:  { $exists: true },
      curso:       { $exists: true },
      materia:     { $exists: true },
      anioLectivo: { $exists: true },
    },
  }
);

/* ===================== HELPERS DE CÁLCULO ===================== */
function round2(n) {
  const v = Number(n ?? 0);
  return Math.round(v * 100) / 100;
}

function recomputeTrim(t) {
  if (!t) return;
  t.promedioTrimestral = round2(t.promedioTrimestral);
  t.calificacionCualitativa = cualiFromPromedio(t.promedioTrimestral);
  t.notaCuantitativa = t.promedioTrimestral; // mismo valor para reportes
}

function recomputeDoc(doc) {
  ['T1','T2','T3'].forEach(k => recomputeTrim(doc[k]));

  const vals = ['T1','T2','T3']
    .map(k => Number(doc[k]?.promedioTrimestral ?? 0))
    .filter(v => v > 0);

  doc.promedioTrimestralAnual = vals.length
    ? round2(vals.reduce((a,b)=>a+b,0) / vals.length)
    : 0;

  if (doc.promedioTrimestralAnual > 0 && Number(doc.evaluacionFinal) > 0) {
    const nota = (doc.promedioTrimestralAnual * 0.90) + (Number(doc.evaluacionFinal) * 0.10);
    doc.notaPromocion = round2(nota);
  } else {
    doc.notaPromocion = 0;
  }
}

/* ===================== HOOKS ===================== */
// create/save
EsquemaCalificacion.pre('save', function(next) {
  recomputeDoc(this);
  next();
});

// update con findOneAndUpdate (incluye dot-paths como "T1.promedioTrimestral")
EsquemaCalificacion.pre('findOneAndUpdate', function(next) {
  const upd  = this.getUpdate() || {};
  const $set = upd.$set || {};

  // Normaliza valores numéricos y reconstruye objetos parciales de T1/T2/T3 si vienen con dot-paths
  const trKeys = ['T1','T2','T3'];
  for (const k of trKeys) {
    // Caso objeto completo: $set.T1 = {...}
    if ($set[k]) {
      // aseguremos tipos numéricos y recalculamos
      $set[k].promedioTrimestral   = round2($set[k].promedioTrimestral);
      $set[k].faltasJustificadas   = Number($set[k].faltasJustificadas ?? 0);
      $set[k].faltasInjustificadas = Number($set[k].faltasInjustificadas ?? 0);
      recomputeTrim($set[k]);
    }
  }

  // Caso dot-paths: $set["T1.promedioTrimestral"] = 7.45, etc.
  const dotPaths = Object.keys($set).filter(p => /^T[123]\./.test(p));
  if (dotPaths.length) {
    // reconstruye por trimestre
    const partial = { T1: {}, T2: {}, T3: {} };
    for (const p of dotPaths) {
      const [tKey, prop] = p.split('.', 2); // ej "T1", "promedioTrimestral"
      if (trKeys.includes(tKey) && prop) {
        partial[tKey][prop] = $set[p];
      }
    }
    // aplica normalización y cálculo a cada t parcial
    for (const tKey of trKeys) {
      if (Object.keys(partial[tKey]).length) {
        const obj = partial[tKey];
        obj.promedioTrimestral   = round2(obj.promedioTrimestral);
        obj.faltasJustificadas   = Number(obj.faltasJustificadas ?? 0);
        obj.faltasInjustificadas = Number(obj.faltasInjustificadas ?? 0);
        recomputeTrim(obj);

        // escribe de vuelta como dot-paths ya calculados
        for (const [prop, val] of Object.entries(obj)) {
          $set[`${tKey}.${prop}`] = val;
        }
      }
    }
  }

  // Recalcular anual si vienen promedios en el update
  const getMaybe = (t) =>
    (typeof $set[`${t}.promedioTrimestral`] !== 'undefined')
      ? Number($set[`${t}.promedioTrimestral`])
      : (typeof $set[t]?.promedioTrimestral !== 'undefined'
          ? Number($set[t].promedioTrimestral)
          : NaN);

  const t1 = getMaybe('T1');
  const t2 = getMaybe('T2');
  const t3 = getMaybe('T3');
  const vals = [t1, t2, t3].filter(v => !Number.isNaN(v) && v > 0);
  if (vals.length) {
    $set.promedioTrimestralAnual = round2(vals.reduce((a,b)=>a+b,0) / vals.length);
  }

  // asegura opciones
  upd.$set = $set;
  this.setUpdate(upd);
  this.setOptions({ new: true, runValidators: true, setDefaultsOnInsert: true });
  next();
});

/* ===================== EXPORT ===================== */
module.exports = mongoose.model('Calificacion', EsquemaCalificacion);
