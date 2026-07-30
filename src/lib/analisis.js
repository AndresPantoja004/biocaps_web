/**
 * BioCaps Monitor® — Motor de análisis automático
 *
 * Implementa:
 *  · Módulo 11: reducción porcentual  % = ((Inicial − Final) / Inicial) × 100
 *  · Módulo 12: indicadores tipo semáforo según límites configurables
 *  · Índice de Calidad de Agua (ICA BioCaps) y cumplimiento normativo
 *  · "Inteligencia del software": interpretaciones y recomendaciones automáticas
 */

/**
 * Semáforo del Módulo 12. Los colores provienden de la paleta de estatus
 * reservada (good / warning / critical); cada nivel viaja siempre con su
 * etiqueta y su emoji, de modo que el estado nunca se comunica sólo por color.
 */
const NIVELES = {
  excelente: { clave: 'excelente', etiqueta: 'Excelente', color: '#0ca30c', emoji: '🟢', peso: 3 },
  aceptable: { clave: 'aceptable', etiqueta: 'Aceptable', color: '#fab219', emoji: '🟡', peso: 2 },
  critico: { clave: 'critico', etiqueta: 'Crítico', color: '#d03b3b', emoji: '🔴', peso: 1 },
  sin_dato: { clave: 'sin_dato', etiqueta: 'Sin dato', color: '#8aa39b', emoji: '⚪', peso: 0 },
};

/** % de reducción de un parámetro entre el valor inicial y el final. */
function porcentajeReduccion(inicial, final) {
  if (inicial === null || inicial === undefined || final === null || final === undefined) return null;
  const i = Number(inicial);
  const f = Number(final);
  if (!Number.isFinite(i) || !Number.isFinite(f) || i === 0) return null;
  return ((i - f) / i) * 100;
}

/** % de variación con signo: positivo = aumentó, negativo = disminuyó. */
function porcentajeVariacion(inicial, final) {
  const red = porcentajeReduccion(inicial, final);
  return red === null ? null : -red;
}

/**
 * Clasifica un valor según los límites configurables del parámetro.
 * Devuelve uno de los tres estados del semáforo del Módulo 12.
 */
function clasificar(parametro, valor) {
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(Number(valor))) {
    return NIVELES.sin_dato;
  }
  const v = Number(valor);

  switch (parametro.direccion) {
    case 'reducir': {
      const exc = parametro.limite_excelente;
      const acep = parametro.limite_aceptable;
      if (exc !== null && v <= exc) return NIVELES.excelente;
      if (acep !== null && v <= acep) return NIVELES.aceptable;
      if (exc === null && acep === null) return NIVELES.sin_dato;
      return NIVELES.critico;
    }
    case 'aumentar': {
      const exc = parametro.limite_excelente;
      const acep = parametro.limite_aceptable;
      if (exc !== null && v >= exc) return NIVELES.excelente;
      if (acep !== null && v >= acep) return NIVELES.aceptable;
      if (exc === null && acep === null) return NIVELES.sin_dato;
      return NIVELES.critico;
    }
    case 'rango': {
      const { rango_ideal_min: im, rango_ideal_max: iM, rango_min: pm, rango_max: pM } = parametro;
      if (im !== null && iM !== null && v >= im && v <= iM) return NIVELES.excelente;
      if (pm !== null && pM !== null && v >= pm && v <= pM) return NIVELES.aceptable;
      if (im === null && pm === null) return NIVELES.sin_dato;
      return NIVELES.critico;
    }
    default:
      return NIVELES.sin_dato;
  }
}

/** ¿El valor cumple el límite normativo (equivalente al umbral "aceptable")? */
function cumpleNormativa(parametro, valor) {
  if (parametro.tipo === 'cualitativo') return null;
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return null;
  const v = Number(valor);
  switch (parametro.direccion) {
    case 'reducir':
      return parametro.limite_aceptable === null ? null : v <= parametro.limite_aceptable;
    case 'aumentar':
      return parametro.limite_aceptable === null ? null : v >= parametro.limite_aceptable;
    case 'rango':
      return parametro.rango_min === null || parametro.rango_max === null
        ? null
        : v >= parametro.rango_min && v <= parametro.rango_max;
    default:
      return null;
  }
}

/** Sub-índice 0–100 de calidad para un parámetro. */
function subIndice(parametro, valor) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return null;
  const v = Number(valor);
  const clamp = (x) => Math.max(0, Math.min(100, x));

  if (parametro.direccion === 'reducir') {
    const exc = parametro.limite_excelente;
    const acep = parametro.limite_aceptable;
    if (exc === null || acep === null || acep <= 0) return null;
    if (v <= exc) return clamp(100 - 15 * (v / exc));
    if (v <= acep) return clamp(85 - 25 * ((v - exc) / Math.max(acep - exc, 1e-9)));
    return clamp(60 - 60 * ((v - acep) / (2 * acep)));
  }

  if (parametro.direccion === 'aumentar') {
    const exc = parametro.limite_excelente;
    const acep = parametro.limite_aceptable;
    if (exc === null || acep === null) return null;
    if (v >= exc) return clamp(85 + 15 * Math.min(1, (v - exc) / Math.max(exc, 1e-9)));
    if (v >= acep) return clamp(60 + 25 * ((v - acep) / Math.max(exc - acep, 1e-9)));
    return clamp(60 * (v / Math.max(acep, 1e-9)));
  }

  if (parametro.direccion === 'rango') {
    const { rango_ideal_min: im, rango_ideal_max: iM, rango_min: pm, rango_max: pM } = parametro;
    if (im === null || iM === null || pm === null || pM === null) return null;
    if (v >= im && v <= iM) return 95;
    if (v >= pm && v <= pM) {
      const dist = v < im ? (im - v) / Math.max(im - pm, 1e-9) : (v - iM) / Math.max(pM - iM, 1e-9);
      return clamp(85 - 20 * dist);
    }
    const exceso = v < pm ? (pm - v) / Math.max(pm, 1e-9) : (v - pM) / Math.max(pM, 1e-9);
    return clamp(60 - 120 * exceso);
  }

  return null;
}

/**
 * Compara dos muestreos (antes / después) parámetro por parámetro.
 * @param {Array} parametros catálogo de parámetros
 * @param {Object} antes    mapa { codigo: {valor, valor_texto} }
 * @param {Object} despues  mapa { codigo: {valor, valor_texto} }
 */
function compararMuestreos(parametros, antes, despues) {
  const filas = [];

  for (const p of parametros) {
    const a = antes?.[p.codigo] ?? null;
    const d = despues?.[p.codigo] ?? null;
    const vA = a && a.valor !== null && a.valor !== undefined ? Number(a.valor) : null;
    const vD = d && d.valor !== null && d.valor !== undefined ? Number(d.valor) : null;

    const esReducible = p.direccion === 'reducir';
    const reduccion = esReducible ? porcentajeReduccion(vA, vD) : null;
    const variacion = porcentajeVariacion(vA, vD);

    filas.push({
      codigo: p.codigo,
      nombre: p.nombre,
      simbolo: p.simbolo,
      unidad: p.unidad,
      tipo: p.tipo,
      direccion: p.direccion,
      clave: !!p.clave,
      normativa: p.normativa,
      limite_excelente: p.limite_excelente,
      limite_aceptable: p.limite_aceptable,
      rango_min: p.rango_min,
      rango_max: p.rango_max,
      rango_ideal_min: p.rango_ideal_min,
      rango_ideal_max: p.rango_ideal_max,
      valor_antes: vA,
      valor_despues: vD,
      texto_antes: a?.valor_texto ?? null,
      texto_despues: d?.valor_texto ?? null,
      reduccion,
      variacion,
      nivel_antes: clasificar(p, vA),
      nivel_despues: clasificar(p, vD),
      cumple_antes: cumpleNormativa(p, vA),
      cumple_despues: cumpleNormativa(p, vD),
      ica_antes: subIndice(p, vA),
      ica_despues: subIndice(p, vD),
    });
  }

  return filas;
}

function promedio(valores) {
  const v = valores.filter((x) => x !== null && x !== undefined && Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((s, x) => s + x, 0) / v.length;
}

/** Clasificación textual del Índice de Calidad de Agua. */
function clasificarICA(ica) {
  if (ica === null || ica === undefined) return { etiqueta: 'Sin datos', color: '#8aa39b', clave: 'sin_dato', emoji: '⚪' };
  if (ica >= 85) return { etiqueta: 'Excelente', color: '#0ca30c', clave: 'excelente', emoji: '🟢' };
  if (ica >= 70) return { etiqueta: 'Buena', color: '#0ca30c', clave: 'buena', emoji: '🟢' };
  if (ica >= 55) return { etiqueta: 'Aceptable', color: '#fab219', clave: 'aceptable', emoji: '🟡' };
  if (ica >= 35) return { etiqueta: 'Deficiente', color: '#ec835a', clave: 'deficiente', emoji: '🟠' };
  return { etiqueta: 'Crítica', color: '#d03b3b', clave: 'critica', emoji: '🔴' };
}

/** Resumen agregado de una comparación antes/después. */
function resumirComparacion(filas) {
  const clavesReducibles = filas.filter((f) => f.direccion === 'reducir' && f.clave && f.reduccion !== null);
  const evaluables = filas.filter((f) => f.cumple_despues !== null);
  const cumplen = evaluables.filter((f) => f.cumple_despues === true);

  const icaAntes = promedio(filas.map((f) => f.ica_antes));
  const icaDespues = promedio(filas.map((f) => f.ica_despues));

  return {
    reduccion_promedio: promedio(clavesReducibles.map((f) => f.reduccion)),
    parametros_evaluados: evaluables.length,
    parametros_cumplen: cumplen.length,
    cumplimiento_pct: evaluables.length ? (cumplen.length / evaluables.length) * 100 : null,
    no_cumplen: evaluables.filter((f) => f.cumple_despues === false).map((f) => f.simbolo || f.nombre),
    ica_antes: icaAntes,
    ica_despues: icaDespues,
    ica_delta: icaAntes !== null && icaDespues !== null ? icaDespues - icaAntes : null,
    calidad_antes: clasificarICA(icaAntes),
    calidad_despues: clasificarICA(icaDespues),
    semaforo: {
      excelente: filas.filter((f) => f.nivel_despues.clave === 'excelente').length,
      aceptable: filas.filter((f) => f.nivel_despues.clave === 'aceptable').length,
      critico: filas.filter((f) => f.nivel_despues.clave === 'critico').length,
    },
  };
}

/* ------------------- Inteligencia del software ------------------- */

const REGLAS = [
  {
    codigo: 'nh4_n',
    evaluar: (f) => f.valor_despues !== null && f.cumple_despues === false,
    mensaje: () => ({
      tipo: 'alerta',
      icono: '⚠',
      titulo: 'Concentración elevada de nitrógeno amoniacal',
      texto: 'Se recomienda aumentar la dosis de biocápsulas y verificar la aireación del reactor para favorecer la nitrificación.',
    }),
  },
  {
    codigo: 'nh4_n',
    evaluar: (f) => f.reduccion !== null && f.reduccion >= 70 && f.cumple_despues !== false,
    mensaje: (f) => ({
      tipo: 'exito',
      icono: '✓',
      titulo: 'Nitrificación efectiva',
      texto: `El nitrógeno amoniacal se redujo ${f.reduccion.toFixed(1)} %: el consorcio nitrificante encapsulado está activo.`,
    }),
  },
  {
    codigo: 'dbo5',
    evaluar: (f) => f.reduccion !== null && f.reduccion > 0,
    mensaje: (f) => ({
      tipo: f.reduccion >= 50 ? 'exito' : 'info',
      icono: f.reduccion >= 50 ? '✓' : 'ℹ',
      titulo: f.reduccion >= 50 ? 'Tratamiento eficiente' : 'Tratamiento en progreso',
      texto: `La DBO₅ disminuyó ${f.reduccion.toFixed(1)} % respecto al afluente.`,
    }),
  },
  {
    codigo: 'dbo5',
    evaluar: (f) => f.reduccion !== null && f.reduccion <= 0,
    mensaje: () => ({
      tipo: 'alerta',
      icono: '⚠',
      titulo: 'La DBO₅ no disminuyó',
      texto: 'Revise el tiempo de retención hidráulica, la viabilidad del lote de biocápsulas y posibles cargas de choque.',
    }),
  },
  {
    codigo: 'dqo',
    evaluar: (f) => f.reduccion !== null && f.reduccion > 0,
    mensaje: (f) => ({
      tipo: f.reduccion >= 50 ? 'exito' : 'info',
      icono: f.reduccion >= 50 ? '✓' : 'ℹ',
      titulo: f.reduccion >= 50 ? 'Alta degradación de materia orgánica' : 'Degradación parcial de materia orgánica',
      texto: `La DQO disminuyó ${f.reduccion.toFixed(1)} %.`,
    }),
  },
  {
    codigo: 'ph',
    evaluar: (f) => f.valor_despues !== null && f.cumple_despues === false,
    mensaje: (f) => ({
      tipo: 'alerta',
      icono: '⚠',
      titulo: 'pH fuera del rango permisible',
      texto: `El pH del efluente es ${f.valor_despues}. Fuera de 6–9 la actividad bacteriana encapsulada se inhibe; corrija con dosificación alcalina o ácida.`,
    }),
  },
  {
    codigo: 'oxigeno_disuelto',
    evaluar: (f) => f.valor_despues !== null && f.valor_despues < 2,
    mensaje: (f) => ({
      tipo: 'alerta',
      icono: '⚠',
      titulo: 'Oxígeno disuelto insuficiente',
      texto: `OD = ${f.valor_despues} mg/L. Condiciones cercanas a la anoxia limitan la oxidación aerobia; incremente la aireación.`,
    }),
  },
  {
    codigo: 'oxigeno_disuelto',
    evaluar: (f) => f.valor_antes !== null && f.valor_despues !== null && f.valor_despues > f.valor_antes,
    mensaje: (f) => ({
      tipo: 'exito',
      icono: '✓',
      titulo: 'Recuperación de oxígeno disuelto',
      texto: `El OD subió de ${f.valor_antes} a ${f.valor_despues} mg/L, señal de estabilización del efluente.`,
    }),
  },
  {
    codigo: 'sst',
    evaluar: (f) => f.reduccion !== null && f.reduccion >= 50,
    mensaje: (f) => ({
      tipo: 'exito',
      icono: '✓',
      titulo: 'Clarificación satisfactoria',
      texto: `Los sólidos suspendidos totales bajaron ${f.reduccion.toFixed(1)} %.`,
    }),
  },
  {
    codigo: 'turbidez',
    evaluar: (f) => f.valor_despues !== null && f.cumple_despues === false,
    mensaje: () => ({
      tipo: 'alerta',
      icono: '⚠',
      titulo: 'Turbidez sobre el valor de referencia',
      texto: 'Considere una etapa de sedimentación o filtración complementaria antes de la descarga.',
    }),
  },
  {
    codigo: 'coliformes_totales',
    evaluar: (f) => f.valor_despues !== null && f.cumple_despues === false,
    mensaje: () => ({
      tipo: 'alerta',
      icono: '⚠',
      titulo: 'Carga microbiológica elevada',
      texto: 'Los coliformes totales superan el límite de descarga; se requiere una etapa de desinfección final.',
    }),
  },
  {
    codigo: 'fosforo_total',
    evaluar: (f) => f.valor_despues !== null && f.cumple_despues === false,
    mensaje: () => ({
      tipo: 'alerta',
      icono: '⚠',
      titulo: 'Fósforo total sobre el límite',
      texto: 'Riesgo de eutrofización en el cuerpo receptor; evalúe precipitación química o consorcios acumuladores de fósforo.',
    }),
  },
];

/**
 * Genera las interpretaciones y recomendaciones automáticas del software.
 * @param {Array} filas resultado de compararMuestreos()
 * @param {Object} resumen resultado de resumirComparacion()
 */
function generarInteligencia(filas, resumen) {
  const porCodigo = Object.fromEntries(filas.map((f) => [f.codigo, f]));
  const mensajes = [];

  for (const regla of REGLAS) {
    const fila = porCodigo[regla.codigo];
    if (!fila) continue;
    try {
      if (regla.evaluar(fila)) mensajes.push({ parametro: fila.simbolo || fila.nombre, ...regla.mensaje(fila) });
    } catch {
      /* una regla nunca debe romper el análisis */
    }
  }

  if (resumen.reduccion_promedio !== null) {
    const r = resumen.reduccion_promedio;
    if (r >= 80) {
      mensajes.unshift({
        parametro: 'Global', tipo: 'exito', icono: '✓',
        titulo: 'Desempeño global sobresaliente',
        texto: `Reducción promedio de ${r.toFixed(1)} % en los parámetros clave. El tratamiento con biocápsulas cumple el objetivo de diseño.`,
      });
    } else if (r >= 50) {
      mensajes.unshift({
        parametro: 'Global', tipo: 'info', icono: 'ℹ',
        titulo: 'Desempeño global aceptable',
        texto: `Reducción promedio de ${r.toFixed(1)} %. Existe margen de mejora ajustando dosis y tiempo de retención.`,
      });
    } else {
      mensajes.unshift({
        parametro: 'Global', tipo: 'alerta', icono: '⚠',
        titulo: 'Desempeño global bajo',
        texto: `La reducción promedio es de ${r.toFixed(1)} %. Verifique la vida útil del lote de biocápsulas y las condiciones operativas.`,
      });
    }
  }

  if (resumen.cumplimiento_pct !== null) {
    if (resumen.cumplimiento_pct === 100) {
      mensajes.push({
        parametro: 'Normativa', tipo: 'exito', icono: '✓',
        titulo: 'Cumplimiento normativo total',
        texto: 'Todos los parámetros evaluados del efluente cumplen los límites de descarga configurados.',
      });
    } else {
      mensajes.push({
        parametro: 'Normativa', tipo: 'alerta', icono: '⚠',
        titulo: `Cumplimiento normativo parcial (${resumen.cumplimiento_pct.toFixed(0)} %)`,
        texto: `Parámetros fuera de norma: ${resumen.no_cumplen.join(', ')}.`,
      });
    }
  }

  return mensajes;
}

/** Conclusión e interpretación técnica redactadas para el reporte PDF. */
function redactarConclusion(filas, resumen, contexto = {}) {
  const porCodigo = Object.fromEntries(filas.map((f) => [f.codigo, f]));
  const fmt = (n, d = 1) => (n === null || n === undefined ? 'n/d' : Number(n).toFixed(d));
  const destacados = ['nh4_n', 'dbo5', 'dqo', 'sst', 'turbidez']
    .map((c) => porCodigo[c])
    .filter((f) => f && f.reduccion !== null)
    .map((f) => `${f.simbolo} ${fmt(f.reduccion)} %`);

  const interpretacion = [
    `El tratamiento biológico con biocápsulas de alginato aplicado en ${contexto.proyecto || 'el proyecto'} ` +
      `registró una reducción promedio de ${fmt(resumen.reduccion_promedio)} % en los parámetros clave de contaminación.`,
    destacados.length ? `Reducciones por parámetro: ${destacados.join('; ')}.` : '',
    `El Índice de Calidad de Agua BioCaps pasó de ${fmt(resumen.ica_antes, 0)}/100 (${resumen.calidad_antes.etiqueta}) ` +
      `a ${fmt(resumen.ica_despues, 0)}/100 (${resumen.calidad_despues.etiqueta}).`,
  ].filter(Boolean).join(' ');

  let conclusion;
  if (resumen.cumplimiento_pct === 100 && (resumen.reduccion_promedio ?? 0) >= 60) {
    conclusion =
      'El sistema de biorremediación con biocápsulas demostró alta eficiencia: el efluente tratado cumple la totalidad ' +
      'de los límites máximos permisibles configurados y puede ser descargado al cuerpo receptor. Se recomienda mantener ' +
      'la dosis y frecuencia de recambio actuales, y continuar el monitoreo periódico.';
  } else if ((resumen.cumplimiento_pct ?? 0) >= 70) {
    conclusion =
      'El tratamiento logró una mejora sustancial de la calidad del agua, aunque persisten parámetros por encima del ' +
      `límite permisible (${resumen.no_cumplen.join(', ') || 'ninguno'}). Se recomienda ajustar la dosis de biocápsulas ` +
      'y el tiempo de retención hidráulica antes de la descarga definitiva.';
  } else {
    conclusion =
      'El desempeño del tratamiento se encuentra por debajo del objetivo de diseño. Se recomienda revisar la viabilidad ' +
      'del lote de biocápsulas (fecha de encapsulación y vida útil), la concentración bacteriana aplicada y las ' +
      'condiciones operativas del reactor antes de emitir un certificado de cumplimiento.';
  }

  return { interpretacion, conclusion };
}

module.exports = {
  NIVELES,
  porcentajeReduccion,
  porcentajeVariacion,
  clasificar,
  cumpleNormativa,
  subIndice,
  compararMuestreos,
  resumirComparacion,
  clasificarICA,
  generarInteligencia,
  redactarConclusion,
  promedio,
};
