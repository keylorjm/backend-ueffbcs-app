// models/Calificacion.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/* ----------------------- Helpers numéricos ----------------------- */
const clamp01 = (n, min = 0, max = 10) => {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return 0;
  return Math.max(min, Math.min(max, v));
};

const toNumberOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ------------------- Escala cualitativa (virtual) ------------------- */
const cualiFromPromedio = (p) => {
  if (p === null || p === undefined) return '-';
  const n = Number(p);
  if (!Number.isFinite(n)) return '-';
  // Ajusta esta escala a tu institución si hace falta
  if (n >= 9.50) return 'A+';
  if (n >= 9.00) return 'A';
  if (n >= 8.50) return 'B+';
  if (n >= 8.00) return 'B';
  if (n >= 7.00) return 'C+';
  if (n >= 5.00) return 'C';
  return 'D';
};

/* ----------------------- Subesquema Trimestre ----------------------- */
const TrimestreSchema = new Schema(
  {
    promedioTrimestral: { type: Number, default: null }, // 0–10
    faltasJustificadas: { type: Number, default: 0 },
    faltasInjustificadas: { type: Number, default: 0 },
    asistenciaTotal: { type: Number, default: 0 }, // opcional (días/clases)
  },
  { _id: false }
);

/* --------------------------- Esquema main --------------------------- */
const CalificacionSchema = new Schema(
  {
    estudiante: {
      type: Schema.Types.ObjectId,
      ref: 'Estudiante',
      required: true,
      index: true,
    },
    curso: {
      type: Schema.Types.ObjectId,
      ref: 'Curso',
      required: true,
      index: true,
    },
    materia: {
      type: Schema.Types.ObjectId,
      ref: 'Materia',
      required: true,
      index: true,
    },
    anioLectivo: {
      type: Schema.Types.ObjectId,
      ref: 'AnioLectivo',
      required: true,
      index: true,
    },

    // Trimestres
    T1: { type: TrimestreSchema, default: () => ({}) },
    T2: { type: TrimestreSchema, default: () => ({}) },
    T3: { type: TrimestreSchema, default: () => ({}) },

    // Derivados / anuales
    promedioTrimestralAnual: { type: Number, default: null }, // promedio (T1+T2+T3)/#presentes
    evaluacionFinal: { type: Number, default: null },          // opcional (examen final)
    notaPromocion: { type: Number, default: null },            // ej. promedio de (anual, final) si aplica
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* -------------- Índice único por identidad de registro -------------- */
CalificacionSchema.index(
  { estudiante: 1, curso: 1, materia: 1, anioLectivo: 1 },
  { unique: true, name: 'uq_calif_est_cur_mat_anio' }
);

/* ------------------------- Virtual cualitativa ------------------------ */
CalificacionSchema.virtual('cualitativa').get(function () {
  return cualiFromPromedio(this.promedioTrimestralAnual);
});

/* ---------------------- Cálculo de derivados ---------------------- */
function computeDerived(docLike) {
  // Asegura números en rango 0–10 si están presentes
  const t1 = toNumberOrNull(docLike?.T1?.promedioTrimestral);
  const t2 = toNumberOrNull(docLike?.T2?.promedioTrimestral);
  const t3 = toNumberOrNull(docLike?.T3?.promedioTrimestral);

  const vals = [];
  if (t1 !== null) vals.push(clamp01(t1));
  if (t2 !== null) vals.push(clamp01(t2));
  if (t3 !== null) vals.push(clamp01(t3));

  let promedioTrimestralAnual = null;
  if (vals.length > 0) {
    promedioTrimestralAnual = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  let evaluacionFinal = toNumberOrNull(docLike?.evaluacionFinal);
  if (evaluacionFinal !== null) evaluacionFinal = clamp01(evaluacionFinal);

  // Regla de ejemplo para notaPromocion:
  // - Si hay evaluacionFinal: promedio entre anual y final
  // - Si NO hay evaluacionFinal: igual al promedio anual
  let notaPromocion = null;
  if (promedioTrimestralAnual !== null && evaluacionFinal !== null) {
    notaPromocion = (promedioTrimestralAnual + evaluacionFinal) / 2;
  } else if (promedioTrimestralAnual !== null) {
    notaPromocion = promedioTrimestralAnual;
  }

  return { promedioTrimestralAnual, evaluacionFinal, notaPromocion };
}

/* ----------------------- Normalización de set ----------------------- */
function clampTrimestreFields(tri) {
  if (!tri) return tri;
  const out = { ...tri };
  if (out.promedioTrimestral !== undefined && out.promedioTrimestral !== null) {
    out.promedioTrimestral = clamp01(out.promedioTrimestral);
  }
  if (out.faltasJustificadas !== undefined && out.faltasJustificadas !== null) {
    out.faltasJustificadas = Math.max(0, Number(out.faltasJustificadas || 0));
  }
  if (out.faltasInjustificadas !== undefined && out.faltasInjustificadas !== null) {
    out.faltasInjustificadas = Math.max(0, Number(out.faltasInjustificadas || 0));
  }
  if (out.asistenciaTotal !== undefined && out.asistenciaTotal !== null) {
    out.asistenciaTotal = Math.max(0, Number(out.asistenciaTotal || 0));
  }
  return out;
}

/* ------------------------------ Hooks ------------------------------ */
// save()
CalificacionSchema.pre('save', function (next) {
  // clamp por si vinieron números fuera de rango
  if (this.T1) this.T1 = clampTrimestreFields(this.T1);
  if (this.T2) this.T2 = clampTrimestreFields(this.T2);
  if (this.T3) this.T3 = clampTrimestreFields(this.T3);
  if (this.evaluacionFinal !== null && this.evaluacionFinal !== undefined) {
    this.evaluacionFinal = clamp01(this.evaluacionFinal);
  }

  const d = computeDerived(this);
  this.promedioTrimestralAnual = d.promedioTrimestralAnual;
  this.notaPromocion = d.notaPromocion;
  next();
});

// findOneAndUpdate(), updateOne(), bulkWrite(updateOne)
CalificacionSchema.pre(['findOneAndUpdate', 'updateOne'], function (next) {
  const upd = this.getUpdate() || {};
  const $set = upd.$set || {};

  // Normaliza dot-paths que puedan venir desde bulk-trimestre
  // Ej: "T1.promedioTrimestral": 7.83
  for (const k of Object.keys($set)) {
    if (k.startsWith('T1.') || k === 'T1') {
      // si es objeto completo
      if (k === 'T1' && typeof $set[k] === 'object') {
        $set[k] = clampTrimestreFields($set[k]);
      }
      if (k === 'T1.promedioTrimestral') $set[k] = clamp01($set[k]);
    }
    if (k.startsWith('T2.') || k === 'T2') {
      if (k === 'T2' && typeof $set[k] === 'object') {
        $set[k] = clampTrimestreFields($set[k]);
      }
      if (k === 'T2.promedioTrimestral') $set[k] = clamp01($set[k]);
    }
    if (k.startsWith('T3.') || k === 'T3') {
      if (k === 'T3' && typeof $set[k] === 'object') {
        $set[k] = clampTrimestreFields($set[k]);
      }
      if (k === 'T3.promedioTrimestral') $set[k] = clamp01($set[k]);
    }
    if (k === 'evaluacionFinal') {
      $set[k] = clamp01($set[k]);
    }
  }

  // Necesitamos calcular derivados con lo que habrá después de aplicar el update.
  // Para eso, pedimos el doc actual y "simulamos" el merge.
  this.model.findOne(this.getQuery()).lean().then((current) => {
    const snapshot = current ? { ...current } : {};
    // aplica $set superficialmente (suficiente para nuestros campos)
    for (const k of Object.keys($set)) {
      const path = k.split('.');
      let ref = snapshot;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (typeof ref[key] !== 'object' || ref[key] === null) ref[key] = {};
        ref = ref[key];
      }
      ref[path[path.length - 1]] = $set[k];
    }

    const d = computeDerived(snapshot);
    $set['promedioTrimestralAnual'] = d.promedioTrimestralAnual;
    $set['notaPromocion'] = d.notaPromocion;

    // reinyecta el $set modificado
    upd.$set = $set;
    this.setUpdate(upd);
    next();
  }).catch(next);
});

/* ----------------------- toJSON limpieza mínima ---------------------- */
CalificacionSchema.methods.toJSON = function () {
  const { __v, ...obj } = this.toObject({ virtuals: true });
  return obj;
};

module.exports = model('Calificacion', CalificacionSchema);
