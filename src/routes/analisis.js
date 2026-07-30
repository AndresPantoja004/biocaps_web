/**
 * Análisis automático — comparación Antes vs Después (Módulos 11, 12 e Inteligencia)
 * Se recalcula en cada petición, por lo que los indicadores del dashboard y los
 * gráficos se actualizan en tiempo real al ingresar nuevos resultados.
 */
const express = require('express');
const { all, get } = require('../db');
const { requiereSesion } = require('../lib/auth');
const A = require('../lib/analisis');
const { catalogoParametros, resultadosDe, puedeVerProyecto } = require('./muestreos');

const router = express.Router();

/** Elige el par de muestreos a comparar: los indicados o el último de cada etapa. */
function elegirPar(proyectoId, antesId, despuesId) {
  const buscarUltimo = (etapa) => get(
    `SELECT * FROM muestreos WHERE proyecto_id = ? AND etapa = ?
     ORDER BY date(fecha_muestreo) DESC, id DESC LIMIT 1`, proyectoId, etapa,
  );
  const antes = antesId
    ? get('SELECT * FROM muestreos WHERE id = ? AND proyecto_id = ?', Number(antesId), proyectoId)
    : buscarUltimo('antes');
  const despues = despuesId
    ? get('SELECT * FROM muestreos WHERE id = ? AND proyecto_id = ?', Number(despuesId), proyectoId)
    : buscarUltimo('despues');
  return { antes, despues };
}

/** Construye el análisis completo de un proyecto (usado también por el generador de PDF). */
function analizarProyecto(proyectoId, antesId, despuesId) {
  const proyecto = get(
    `SELECT p.*, c.nombre AS cliente_nombre, c.tipo AS cliente_tipo, c.contacto AS cliente_contacto,
            c.correo AS cliente_correo, c.telefono AS cliente_telefono, c.direccion AS cliente_direccion,
            c.ciudad AS cliente_ciudad
     FROM proyectos p JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?`, proyectoId,
  );
  if (!proyecto) return null;

  const { antes, despues } = elegirPar(proyectoId, antesId, despuesId);
  const parametros = catalogoParametros();

  const datosAntes = antes ? resultadosDe(antes.id) : {};
  const datosDespues = despues ? resultadosDe(despues.id) : {};
  const filas = A.compararMuestreos(parametros, datosAntes, datosDespues);
  const resumen = A.resumirComparacion(filas);
  const inteligencia = A.generarInteligencia(filas, resumen);
  const textos = A.redactarConclusion(filas, resumen, { proyecto: proyecto.nombre });

  const enriquecer = (m) => {
    if (!m) return null;
    const extra = get(
      `SELECT pm.codigo AS punto_codigo, pm.nombre AS punto_nombre, pm.tipo AS punto_tipo,
              pm.latitud AS punto_latitud, pm.longitud AS punto_longitud,
              f.ruta AS punto_fotografia,
              b.lote AS biocapsula_lote, b.concentracion_ufc_ml, b.diametro_mm, b.numero_capsulas,
              b.peso_g, b.alginato_sodio_pct, b.cacl2_pct, b.fecha_encapsulacion, b.vida_util_dias,
              cb.nombre AS consorcio_nombre, cb.especies AS consorcio_especies,
              u.nombre AS registrado_por
       FROM muestreos m
       LEFT JOIN puntos_muestreo pm ON pm.id = m.punto_id
       LEFT JOIN fotografias f ON f.id = pm.fotografia_id
       LEFT JOIN biocapsulas b ON b.id = m.biocapsula_id
       LEFT JOIN consorcios_bacterianos cb ON cb.id = b.consorcio_id
       LEFT JOIN usuarios u ON u.id = m.created_by
       WHERE m.id = ?`, m.id,
    ) || {};
    return { ...m, ...extra };
  };

  return {
    proyecto,
    antes: enriquecer(antes),
    despues: enriquecer(despues),
    parametros: filas,
    resumen,
    inteligencia,
    ...textos,
    disponibles: all(
      `SELECT id, codigo, etapa, fecha_muestreo FROM muestreos
       WHERE proyecto_id = ? ORDER BY date(fecha_muestreo), id`, proyectoId,
    ),
  };
}

router.get('/proyecto/:id', requiereSesion, (req, res) => {
  const proyectoId = Number(req.params.id);
  if (!puedeVerProyecto(req, proyectoId)) {
    return res.status(403).json({ error: 'No tiene acceso a este proyecto.' });
  }
  const analisis = analizarProyecto(proyectoId, req.query.antes, req.query.despues);
  if (!analisis) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  if (!analisis.antes || !analisis.despues) {
    return res.json({
      ...analisis,
      incompleto: true,
      aviso: 'Se requieren al menos un muestreo "antes" y uno "después" del tratamiento para el análisis comparativo.',
    });
  }
  res.json(analisis);
});

/** Evolución mensual de los parámetros clave del efluente tratado. */
router.get('/proyecto/:id/evolucion', requiereSesion, (req, res) => {
  const proyectoId = Number(req.params.id);
  if (!puedeVerProyecto(req, proyectoId)) {
    return res.status(403).json({ error: 'No tiene acceso a este proyecto.' });
  }
  const codigos = (req.query.parametros || 'nh4_n,dbo5,dqo,sst').split(',').map((s) => s.trim());
  const marcadores = codigos.map(() => '?').join(',');

  const filas = all(
    `SELECT strftime('%Y-%m', m.fecha_muestreo) AS mes, m.etapa, p.codigo, p.simbolo,
            AVG(r.valor) AS promedio, COUNT(*) AS n
     FROM resultados r
     JOIN muestreos m ON m.id = r.muestreo_id
     JOIN parametros p ON p.id = r.parametro_id
     WHERE m.proyecto_id = ? AND p.codigo IN (${marcadores}) AND r.valor IS NOT NULL
     GROUP BY mes, m.etapa, p.codigo
     ORDER BY mes`,
    proyectoId, ...codigos,
  );

  const meses = [...new Set(filas.map((f) => f.mes))].sort();
  const series = [];
  for (const cod of codigos) {
    for (const etapa of ['antes', 'despues']) {
      const puntos = meses.map((mes) => {
        const f = filas.find((x) => x.mes === mes && x.codigo === cod && x.etapa === etapa);
        return f ? Number(f.promedio.toFixed(2)) : null;
      });
      if (puntos.some((v) => v !== null)) {
        const simbolo = filas.find((x) => x.codigo === cod)?.simbolo || cod;
        series.push({ codigo: cod, etapa, etiqueta: `${simbolo} — ${etapa === 'antes' ? 'Afluente' : 'Efluente'}`, datos: puntos });
      }
    }
  }
  res.json({ meses, series });
});

/** Serie de eficiencia (% de remoción) por muestreo "después" a lo largo del tiempo. */
router.get('/proyecto/:id/eficiencia', requiereSesion, (req, res) => {
  const proyectoId = Number(req.params.id);
  if (!puedeVerProyecto(req, proyectoId)) {
    return res.status(403).json({ error: 'No tiene acceso a este proyecto.' });
  }
  const parametros = catalogoParametros();
  const antesBase = get(
    `SELECT * FROM muestreos WHERE proyecto_id = ? AND etapa = 'antes'
     ORDER BY date(fecha_muestreo), id LIMIT 1`, proyectoId,
  );
  if (!antesBase) return res.json({ puntos: [] });

  const datosAntes = resultadosDe(antesBase.id);
  const despues = all(
    `SELECT * FROM muestreos WHERE proyecto_id = ? AND etapa = 'despues'
     ORDER BY date(fecha_muestreo), id`, proyectoId,
  );

  const puntos = despues.map((m) => {
    const filas = A.compararMuestreos(parametros, datosAntes, resultadosDe(m.id));
    const resumen = A.resumirComparacion(filas);
    return {
      muestreo_id: m.id, codigo: m.codigo, fecha: m.fecha_muestreo,
      reduccion_promedio: resumen.reduccion_promedio,
      cumplimiento_pct: resumen.cumplimiento_pct,
      ica: resumen.ica_despues,
    };
  });
  res.json({ base: { id: antesBase.id, codigo: antesBase.codigo, fecha: antesBase.fecha_muestreo }, puntos });
});

module.exports = { router, analizarProyecto };
