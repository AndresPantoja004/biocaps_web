/**
 * Módulo 3 — Dashboard principal (tarjetas dinámicas)
 * Módulo 13 — Datos para los gráficos: barras, líneas, gauge, pastel, mapa y radar
 */
const express = require('express');
const { all, get } = require('../db');
const { requiereSesion } = require('../lib/auth');
const A = require('../lib/analisis');
const { catalogoParametros, resultadosDe } = require('./muestreos');

const router = express.Router();

/** Devuelve el filtro de proyectos según el rol (el cliente sólo ve los suyos). */
function alcance(req) {
  if (req.usuario.rol === 'cliente') {
    return { where: 'WHERE p.cliente_id = ?', params: [req.usuario.cliente_id ?? -1], clienteId: req.usuario.cliente_id ?? -1 };
  }
  return { where: '', params: [], clienteId: null };
}

/** Último análisis comparativo de cada proyecto que tenga par antes/después. */
function comparacionesPorProyecto(proyectos) {
  const parametros = catalogoParametros();
  const resultado = [];

  for (const p of proyectos) {
    const antes = get(
      `SELECT * FROM muestreos WHERE proyecto_id = ? AND etapa = 'antes'
       ORDER BY date(fecha_muestreo) DESC, id DESC LIMIT 1`, p.id,
    );
    const despues = get(
      `SELECT * FROM muestreos WHERE proyecto_id = ? AND etapa = 'despues'
       ORDER BY date(fecha_muestreo) DESC, id DESC LIMIT 1`, p.id,
    );
    if (!antes || !despues) continue;

    const filas = A.compararMuestreos(parametros, resultadosDe(antes.id), resultadosDe(despues.id));
    resultado.push({ proyecto: p, filas, resumen: A.resumirComparacion(filas) });
  }
  return resultado;
}

router.get('/', requiereSesion, (req, res) => {
  const { where, params, clienteId } = alcance(req);

  const proyectos = all(
    `SELECT p.*, c.nombre AS cliente_nombre, c.tipo AS cliente_tipo
     FROM proyectos p JOIN clientes c ON c.id = p.cliente_id ${where}
     ORDER BY p.id`, ...params,
  );

  const totalClientes = clienteId
    ? 1
    : get('SELECT COUNT(*) AS n FROM clientes').n;

  const comparaciones = comparacionesPorProyecto(proyectos);
  const reduccionPromedio = A.promedio(comparaciones.map((c) => c.resumen.reduccion_promedio));
  const cumplimientoPromedio = A.promedio(comparaciones.map((c) => c.resumen.cumplimiento_pct));
  const icaPromedio = A.promedio(comparaciones.map((c) => c.resumen.ica_despues));

  const proyectoIds = proyectos.map((p) => p.id);
  const enAlcance = (sql, extra = []) => {
    if (!proyectoIds.length) return [];
    const marcas = proyectoIds.map(() => '?').join(',');
    return all(sql.replace('{IDS}', marcas), ...proyectoIds, ...extra);
  };

  const totalMuestreos = proyectoIds.length
    ? get(
      `SELECT COUNT(*) AS n FROM muestreos WHERE proyecto_id IN (${proyectoIds.map(() => '?').join(',')})`,
      ...proyectoIds,
    ).n
    : 0;
  const totalReportes = proyectoIds.length
    ? get(
      `SELECT COUNT(*) AS n FROM reportes WHERE proyecto_id IN (${proyectoIds.map(() => '?').join(',')})`,
      ...proyectoIds,
    ).n
    : 0;

  /* ---- Tarjetas dinámicas (Módulo 3) ---- */
  const tarjetas = {
    total_clientes: totalClientes,
    total_proyectos: proyectos.length,
    tratamientos_activos: proyectos.filter((p) => p.estado === 'Activo').length,
    tratamientos_finalizados: proyectos.filter((p) => p.estado === 'Finalizado').length,
    total_muestreos: totalMuestreos,
    total_reportes: totalReportes,
    reduccion_promedio: reduccionPromedio,
    cumplimiento_normativo: cumplimientoPromedio,
    ica: icaPromedio,
    calidad_agua: A.clasificarICA(icaPromedio),
    proyectos_analizados: comparaciones.length,
    lotes_vigentes: get(
      `SELECT COUNT(*) AS n FROM biocapsulas
       WHERE fecha_encapsulacion IS NOT NULL AND vida_util_dias IS NOT NULL
         AND date(fecha_encapsulacion, '+' || vida_util_dias || ' days') >= date('now')`,
    ).n,
  };

  /* ---- Gráfico de barras: Antes vs Después (promedio de parámetros clave) ---- */
  const parametrosClave = catalogoParametros().filter((p) => p.clave && p.direccion === 'reducir');
  const barras = parametrosClave.map((p) => {
    const valoresAntes = [];
    const valoresDespues = [];
    for (const c of comparaciones) {
      const f = c.filas.find((x) => x.codigo === p.codigo);
      if (f?.valor_antes !== null && f?.valor_antes !== undefined) valoresAntes.push(f.valor_antes);
      if (f?.valor_despues !== null && f?.valor_despues !== undefined) valoresDespues.push(f.valor_despues);
    }
    return {
      codigo: p.codigo,
      etiqueta: p.simbolo || p.nombre,
      unidad: p.unidad,
      antes: A.promedio(valoresAntes),
      despues: A.promedio(valoresDespues),
      limite: p.limite_aceptable,
    };
  });

  /* ---- Radar: sub-índice de calidad (0–100) por parámetro, antes vs después ----
     Se usa el sub-índice y no el "% del límite" porque este último no está
     acotado: un afluente con 2,4 × 10⁶ NMP/100 mL de coliformes representa el
     120 000 % de su límite y aplastaría el resto de los ejes. */
  const radar = catalogoParametros()
    .filter((p) => p.tipo === 'numerico')
    .map((p) => {
      const recoger = (campo) => comparaciones
        .map((c) => c.filas.find((x) => x.codigo === p.codigo)?.[campo])
        .filter((v) => v !== null && v !== undefined);
      return {
        codigo: p.codigo,
        etiqueta: p.simbolo || p.nombre,
        antes: A.promedio(recoger('ica_antes')),
        despues: A.promedio(recoger('ica_despues')),
        reduccion: A.promedio(recoger('reduccion')),
      };
    })
    .filter((r) => r.antes !== null || r.despues !== null);

  /* ---- Pastel: tipos de clientes ---- */
  const pastel = clienteId
    ? all('SELECT tipo, COUNT(*) AS total FROM clientes WHERE id = ? GROUP BY tipo', clienteId)
    : all('SELECT tipo, COUNT(*) AS total FROM clientes GROUP BY tipo ORDER BY total DESC');

  /* ---- Pastel secundario: tipos de agua tratada ---- */
  const tiposAgua = Object.entries(
    proyectos.reduce((acc, p) => {
      acc[p.tipo_agua] = (acc[p.tipo_agua] || 0) + 1;
      return acc;
    }, {}),
  ).map(([tipo, total]) => ({ tipo, total }));

  /* ---- Gráfico mensual: muestreos y remoción media por mes ---- */
  const mensual = enAlcance(
    `SELECT strftime('%Y-%m', fecha_muestreo) AS mes,
            SUM(CASE WHEN etapa = 'antes' THEN 1 ELSE 0 END) AS antes,
            SUM(CASE WHEN etapa = 'despues' THEN 1 ELSE 0 END) AS despues,
            COUNT(*) AS total
     FROM muestreos WHERE proyecto_id IN ({IDS})
     GROUP BY mes ORDER BY mes`,
  );

  const mensualParametros = enAlcance(
    `SELECT strftime('%Y-%m', m.fecha_muestreo) AS mes, p.codigo, p.simbolo, m.etapa,
            AVG(r.valor) AS promedio
     FROM resultados r
     JOIN muestreos m ON m.id = r.muestreo_id
     JOIN parametros p ON p.id = r.parametro_id
     WHERE m.proyecto_id IN ({IDS}) AND p.codigo IN ('nh4_n','dbo5','dqo') AND r.valor IS NOT NULL
     GROUP BY mes, p.codigo, m.etapa ORDER BY mes`,
  );

  /* ---- Mapa de proyectos ---- */
  const mapa = proyectos
    .filter((p) => p.latitud !== null && p.longitud !== null)
    .map((p) => {
      const comp = comparaciones.find((c) => c.proyecto.id === p.id);
      return {
        id: p.id, nombre: p.nombre, codigo: p.codigo, cliente: p.cliente_nombre,
        ubicacion: p.ubicacion, tipo_agua: p.tipo_agua, estado: p.estado,
        latitud: p.latitud, longitud: p.longitud,
        reduccion: comp?.resumen.reduccion_promedio ?? null,
        cumplimiento: comp?.resumen.cumplimiento_pct ?? null,
        calidad: comp ? comp.resumen.calidad_despues : null,
      };
    });

  /* ---- Ranking de proyectos por eficiencia ---- */
  const ranking = comparaciones
    .map((c) => ({
      id: c.proyecto.id, nombre: c.proyecto.nombre, cliente: c.proyecto.cliente_nombre,
      reduccion: c.resumen.reduccion_promedio, cumplimiento: c.resumen.cumplimiento_pct,
      ica: c.resumen.ica_despues, calidad: c.resumen.calidad_despues,
    }))
    .sort((a, b) => (b.reduccion ?? -1) - (a.reduccion ?? -1));

  /* ---- Semáforo global consolidado ---- */
  const semaforo = comparaciones.reduce(
    (acc, c) => ({
      excelente: acc.excelente + c.resumen.semaforo.excelente,
      aceptable: acc.aceptable + c.resumen.semaforo.aceptable,
      critico: acc.critico + c.resumen.semaforo.critico,
    }),
    { excelente: 0, aceptable: 0, critico: 0 },
  );

  /* ---- Alertas activas de la inteligencia del software ---- */
  const alertas = [];
  for (const c of comparaciones) {
    for (const m of A.generarInteligencia(c.filas, c.resumen)) {
      if (m.tipo === 'alerta') {
        alertas.push({ proyecto: c.proyecto.nombre, proyecto_id: c.proyecto.id, ...m });
      }
    }
  }

  res.json({
    tarjetas, barras, radar, pastel, tipos_agua: tiposAgua,
    mensual, mensual_parametros: mensualParametros, mapa, ranking, semaforo,
    alertas: alertas.slice(0, 8),
    actividad: all(
      `SELECT accion, entidad, detalle, usuario, created_at FROM historial
       ORDER BY id DESC LIMIT 8`,
    ),
  });
});

module.exports = router;
