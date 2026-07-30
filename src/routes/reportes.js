/**
 * Módulo 14 — Reportes técnicos en PDF
 * El servidor emite el registro del reporte (código único, token de verificación,
 * código QR y los textos automáticos); el cliente arma el PDF con los gráficos.
 */
const express = require('express');
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { all, get, run, registrarHistorial } = require('../db');
const { requiereSesion, requiereEdicion } = require('../lib/auth');
const { analizarProyecto } = require('./analisis');
const { puedeVerProyecto } = require('./muestreos');

const router = express.Router();

function urlBase(req) {
  return process.env.BIOCAPS_URL || `${req.protocol}://${req.get('host')}`;
}

async function qrDataUrl(texto) {
  return QRCode.toDataURL(texto, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#05392bff', light: '#ffffffff' },
  });
}

/** Histórico de reportes. */
router.get('/', requiereSesion, (req, res) => {
  const filtros = [];
  const params = [];
  if (req.usuario.rol === 'cliente') {
    filtros.push('p.cliente_id = ?');
    params.push(req.usuario.cliente_id ?? -1);
  }
  if (req.query.proyecto_id) {
    filtros.push('r.proyecto_id = ?');
    params.push(Number(req.query.proyecto_id));
  }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const reportes = all(
    `SELECT r.id, r.codigo, r.titulo, r.token, r.created_at, r.firma_nombre, r.firma_cargo,
            r.proyecto_id, p.nombre AS proyecto_nombre, c.nombre AS cliente_nombre,
            ma.codigo AS muestreo_antes, md.codigo AS muestreo_despues,
            u.nombre AS generado_por, r.resumen_json
     FROM reportes r
     JOIN proyectos p ON p.id = r.proyecto_id
     JOIN clientes c ON c.id = p.cliente_id
     LEFT JOIN muestreos ma ON ma.id = r.muestreo_antes_id
     LEFT JOIN muestreos md ON md.id = r.muestreo_despues_id
     LEFT JOIN usuarios u ON u.id = r.generado_por
     ${where}
     ORDER BY r.id DESC`,
    ...params,
  );

  res.json(reportes.map((r) => {
    let resumen = null;
    try { resumen = r.resumen_json ? JSON.parse(r.resumen_json) : null; } catch { /* ignorar */ }
    const { resumen_json, ...resto } = r;
    return { ...resto, resumen };
  }));
});

/** Vista previa del contenido de un reporte, sin registrarlo todavía. */
router.get('/preparar/:proyectoId', requiereSesion, async (req, res) => {
  const proyectoId = Number(req.params.proyectoId);
  if (!puedeVerProyecto(req, proyectoId)) {
    return res.status(403).json({ error: 'No tiene acceso a este proyecto.' });
  }
  const analisis = analizarProyecto(proyectoId, req.query.antes, req.query.despues);
  if (!analisis) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  if (!analisis.antes || !analisis.despues) {
    return res.status(400).json({
      error: 'Se necesitan un muestreo "antes" y otro "después" para emitir el reporte técnico.',
    });
  }
  res.json(analisis);
});

/** Emite y registra un reporte. */
router.post('/', requiereEdicion, async (req, res) => {
  const b = req.body || {};
  const proyectoId = Number(b.proyecto_id);
  if (!proyectoId) return res.status(400).json({ error: 'Indique el proyecto.' });

  const analisis = analizarProyecto(proyectoId, b.muestreo_antes_id, b.muestreo_despues_id);
  if (!analisis) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  if (!analisis.antes || !analisis.despues) {
    return res.status(400).json({
      error: 'Se necesitan un muestreo "antes" y otro "después" para emitir el reporte técnico.',
    });
  }

  const anio = new Date().getFullYear();
  const n = get(`SELECT COUNT(*) AS n FROM reportes WHERE codigo LIKE 'BC-${anio}-%'`).n + 1;
  const codigo = `BC-${anio}-${String(n).padStart(4, '0')}`;
  const token = crypto.randomBytes(16).toString('hex');

  const resumen = {
    reduccion_promedio: analisis.resumen.reduccion_promedio,
    cumplimiento_pct: analisis.resumen.cumplimiento_pct,
    ica_antes: analisis.resumen.ica_antes,
    ica_despues: analisis.resumen.ica_despues,
    calidad: analisis.resumen.calidad_despues.etiqueta,
    semaforo: analisis.resumen.semaforo,
    parametros: analisis.parametros
      .filter((p) => p.valor_antes !== null || p.valor_despues !== null)
      .map((p) => ({
        simbolo: p.simbolo, unidad: p.unidad,
        antes: p.valor_antes ?? p.texto_antes,
        despues: p.valor_despues ?? p.texto_despues,
        reduccion: p.reduccion, cumple: p.cumple_despues,
        nivel: p.nivel_despues.clave,
      })),
  };

  const titulo = b.titulo || `Informe técnico de eficiencia de tratamiento — ${analisis.proyecto.nombre}`;
  const r = run(
    `INSERT INTO reportes (codigo, proyecto_id, muestreo_antes_id, muestreo_despues_id, titulo,
            resumen_json, firma_nombre, firma_cargo, token, generado_por)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    codigo, proyectoId, analisis.antes.id, analisis.despues.id, titulo,
    JSON.stringify(resumen),
    b.firma_nombre || req.usuario.nombre,
    b.firma_cargo || (req.usuario.rol === 'administrador' ? 'Responsable técnico BioCaps' : 'Analista de laboratorio'),
    token, req.usuario.id,
  );
  const id = Number(r.lastInsertRowid);

  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Generó reporte PDF',
    entidad: 'reportes', entidad_id: id, detalle: `${codigo} — ${analisis.proyecto.nombre}`,
  });

  const urlVerificacion = `${urlBase(req)}/verificar/${token}`;
  res.status(201).json({
    reporte: {
      id, codigo, titulo, token,
      url_verificacion: urlVerificacion,
      qr: await qrDataUrl(urlVerificacion),
      firma_nombre: b.firma_nombre || req.usuario.nombre,
      firma_cargo: b.firma_cargo || (req.usuario.rol === 'administrador' ? 'Responsable técnico BioCaps' : 'Analista de laboratorio'),
      created_at: new Date().toLocaleString('es-EC'),
    },
    analisis,
  });
});

/** Vuelve a entregar los datos de un reporte ya emitido (para reimprimir el PDF). */
router.get('/:id', requiereSesion, async (req, res) => {
  const reporte = get(
    `SELECT r.*, p.nombre AS proyecto_nombre, p.cliente_id, u.nombre AS generado_por_nombre
     FROM reportes r JOIN proyectos p ON p.id = r.proyecto_id
     LEFT JOIN usuarios u ON u.id = r.generado_por WHERE r.id = ?`,
    Number(req.params.id),
  );
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado.' });
  if (!puedeVerProyecto(req, reporte.proyecto_id)) {
    return res.status(403).json({ error: 'No tiene acceso a este reporte.' });
  }

  const analisis = analizarProyecto(reporte.proyecto_id, reporte.muestreo_antes_id, reporte.muestreo_despues_id);
  const urlVerificacion = `${urlBase(req)}/verificar/${reporte.token}`;
  res.json({
    reporte: {
      id: reporte.id, codigo: reporte.codigo, titulo: reporte.titulo, token: reporte.token,
      url_verificacion: urlVerificacion, qr: await qrDataUrl(urlVerificacion),
      firma_nombre: reporte.firma_nombre, firma_cargo: reporte.firma_cargo,
      created_at: reporte.created_at, generado_por: reporte.generado_por_nombre,
    },
    analisis,
  });
});

router.delete('/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const reporte = get('SELECT * FROM reportes WHERE id = ?', id);
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado.' });
  run('DELETE FROM reportes WHERE id = ?', id);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Anuló reporte',
    entidad: 'reportes', entidad_id: id, detalle: reporte.codigo,
  });
  res.json({ ok: true });
});

module.exports = router;
