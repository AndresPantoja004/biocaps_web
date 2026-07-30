/**
 * Módulo 1 — Contenido público de la página de inicio (acerca del emprendimiento,
 * ODS, servicios, noticias) y verificación pública de reportes por código QR.
 */
const express = require('express');
const { all, get } = require('../db');
const { requiereAdmin } = require('../lib/auth');

const router = express.Router();

const ODS = [
  { numero: 6, nombre: 'Agua limpia y saneamiento', color: '#26bde2',
    aporte: 'Devolvemos al ambiente agua tratada que cumple los límites de descarga, reduciendo la contaminación de ríos y esteros.' },
  { numero: 3, nombre: 'Salud y bienestar', color: '#4c9f38',
    aporte: 'La remoción de carga orgánica y coliformes disminuye los riesgos sanitarios en comunidades cercanas a las descargas.' },
  { numero: 9, nombre: 'Industria, innovación e infraestructura', color: '#fd6925',
    aporte: 'Biotecnología nacional de bajo costo: biocápsulas de alginato que se integran a plantas de tratamiento existentes.' },
  { numero: 12, nombre: 'Producción y consumo responsables', color: '#bf8b2e',
    aporte: 'Insumos biodegradables y consorcios bacterianos reutilizables que evitan el uso intensivo de químicos.' },
  { numero: 13, nombre: 'Acción por el clima', color: '#3f7e44',
    aporte: 'La degradación biológica controlada reduce las emisiones asociadas a lagunas anaerobias sin gestión.' },
  { numero: 14, nombre: 'Vida submarina', color: '#0a97d9',
    aporte: 'Menos nitrógeno y fósforo descargados significa menor eutrofización de los cuerpos de agua receptores.' },
];

const SERVICIOS = [
  { icono: 'capsula', titulo: 'Biocápsulas a medida',
    detalle: 'Encapsulación de consorcios bacterianos en alginato de sodio reticulado con CaCl₂, formulados según la carga contaminante de cada efluente.' },
  { icono: 'microscopio', titulo: 'Caracterización fisicoquímica',
    detalle: 'Análisis de los 13 parámetros de calidad de agua antes y después del tratamiento, con métodos estandarizados.' },
  { icono: 'grafico-barras', titulo: 'Monitoreo en plataforma',
    detalle: 'Acceso a BioCaps Monitor® con dashboards ejecutivos, indicadores de semáforo y trazabilidad completa de cada muestreo.' },
  { icono: 'documento', titulo: 'Reportes técnicos certificados',
    detalle: 'Informes en PDF con interpretación técnica, conclusión, firma responsable y código QR de verificación.' },
  { icono: 'planta', titulo: 'Escalamiento y puesta en marcha',
    detalle: 'Acompañamiento en la dosificación, tiempos de retención y recambio de lotes en plantas municipales e industriales.' },
  { icono: 'birrete', titulo: 'Capacitación y transferencia',
    detalle: 'Formación al personal operativo en el manejo de biocápsulas y en la lectura de los indicadores ambientales.' },
];

const EMPRENDIMIENTO = {
  nombre: 'BioCaps Monitor®',
  lema: 'Biotecnología encapsulada para devolver el agua limpia',
  descripcion:
    'BioCaps es un emprendimiento de base biotecnológica que desarrolla biocápsulas de alginato de sodio con consorcios ' +
    'bacterianos seleccionados para el tratamiento de aguas residuales domésticas, industriales, agrícolas y lixiviados. ' +
    'La plataforma BioCaps Monitor® acompaña cada proyecto: registra los análisis fisicoquímicos antes y después del ' +
    'tratamiento, calcula automáticamente la eficiencia de remoción de NH₄⁺-N, DBO₅ y DQO, evalúa el cumplimiento ' +
    'normativo y emite reportes técnicos verificables.',
  problema:
    'Gran parte de las descargas de aguas residuales en el país se realiza sin tratamiento efectivo ni monitoreo continuo, ' +
    'lo que degrada los cuerpos de agua y expone a las comunidades a riesgos sanitarios.',
  solucion:
    'Biocápsulas que inmovilizan bacterias degradadoras —fáciles de dosificar, recuperar y reemplazar— junto a una ' +
    'plataforma que convierte los resultados de laboratorio en decisiones operativas y evidencia de cumplimiento.',
  metricas: [
    { valor: '85 %', etiqueta: 'Remoción de NH₄⁺-N alcanzada en planta piloto' },
    { valor: '13', etiqueta: 'Parámetros de calidad monitoreados' },
    { valor: '6', etiqueta: 'ODS a los que aporta el modelo' },
    { valor: '24 h', etiqueta: 'Tiempo de retención típico por ciclo' },
  ],
};

router.get('/inicio', (_req, res) => {
  const noticias = all('SELECT * FROM noticias ORDER BY date(fecha) DESC, id DESC LIMIT 6');
  res.json({
    emprendimiento: EMPRENDIMIENTO,
    ods: ODS,
    servicios: SERVICIOS,
    noticias,
    estadisticas: {
      clientes: get('SELECT COUNT(*) AS n FROM clientes').n,
      proyectos: get('SELECT COUNT(*) AS n FROM proyectos').n,
      muestreos: get('SELECT COUNT(*) AS n FROM muestreos').n,
      reportes: get('SELECT COUNT(*) AS n FROM reportes').n,
    },
  });
});

/** Verificación pública de un reporte a partir del token del código QR. */
router.get('/verificar/:token', (req, res) => {
  const reporte = get(
    `SELECT r.codigo, r.titulo, r.created_at, r.firma_nombre, r.firma_cargo, r.resumen_json,
            p.nombre AS proyecto_nombre, p.ubicacion, p.tipo_agua,
            c.nombre AS cliente_nombre, c.tipo AS cliente_tipo,
            ma.codigo AS muestreo_antes, ma.fecha_muestreo AS fecha_antes,
            md.codigo AS muestreo_despues, md.fecha_muestreo AS fecha_despues,
            u.nombre AS generado_por
     FROM reportes r
     JOIN proyectos p ON p.id = r.proyecto_id
     JOIN clientes c ON c.id = p.cliente_id
     LEFT JOIN muestreos ma ON ma.id = r.muestreo_antes_id
     LEFT JOIN muestreos md ON md.id = r.muestreo_despues_id
     LEFT JOIN usuarios u ON u.id = r.generado_por
     WHERE r.token = ?`,
    String(req.params.token),
  );
  if (!reporte) {
    return res.status(404).json({ valido: false, error: 'No existe un reporte con ese código de verificación.' });
  }
  let resumen = null;
  try { resumen = reporte.resumen_json ? JSON.parse(reporte.resumen_json) : null; } catch { /* ignorar */ }
  const { resumen_json, ...datos } = reporte;
  res.json({ valido: true, reporte: datos, resumen });
});

/* ------------------------- Gestión de noticias (admin) ------------------------- */

router.post('/noticias', requiereAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.titulo) return res.status(400).json({ error: 'El título es obligatorio.' });
  const r = require('../db').run(
    'INSERT INTO noticias (titulo, resumen, cuerpo, etiqueta, fecha) VALUES (?,?,?,?,?)',
    b.titulo, b.resumen ?? null, b.cuerpo ?? null, b.etiqueta ?? 'Novedad',
    b.fecha ?? new Date().toISOString().slice(0, 10),
  );
  res.status(201).json(get('SELECT * FROM noticias WHERE id = ?', Number(r.lastInsertRowid)));
});

router.delete('/noticias/:id', requiereAdmin, (req, res) => {
  require('../db').run('DELETE FROM noticias WHERE id = ?', Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
