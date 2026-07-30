/**
 * Módulo 7 (el más importante) — Registro de análisis de agua
 * Módulo 8 — Parámetros fisicoquímicos y biológicos
 * Módulos 11 y 12 — Algoritmos automáticos e indicadores (semáforo)
 */
const express = require('express');
const { all, get, run, db, registrarHistorial } = require('../db');
const { requiereSesion, requiereEdicion } = require('../lib/auth');
const A = require('../lib/analisis');

const router = express.Router();

function catalogoParametros() {
  return all('SELECT * FROM parametros ORDER BY orden');
}

/** Mapa { codigo: {valor, valor_texto, metodo} } con los resultados de un muestreo. */
function resultadosDe(muestreoId) {
  const filas = all(
    `SELECT p.codigo, r.valor, r.valor_texto, r.metodo
     FROM resultados r JOIN parametros p ON p.id = r.parametro_id
     WHERE r.muestreo_id = ?`, muestreoId,
  );
  return Object.fromEntries(filas.map((f) => [f.codigo, f]));
}

function puedeVerProyecto(req, proyectoId) {
  if (req.usuario.rol !== 'cliente') return true;
  const p = get('SELECT cliente_id FROM proyectos WHERE id = ?', proyectoId);
  return !!p && p.cliente_id === req.usuario.cliente_id;
}

function detalleMuestreo(id) {
  const m = get(
    `SELECT m.*, p.nombre AS proyecto_nombre, p.tipo_agua, p.ubicacion, p.cliente_id,
            c.nombre AS cliente_nombre,
            pm.codigo AS punto_codigo, pm.nombre AS punto_nombre, pm.tipo AS punto_tipo,
            b.lote AS biocapsula_lote, b.concentracion_ufc_ml, b.diametro_mm,
            b.fecha_encapsulacion, b.vida_util_dias, b.numero_capsulas,
            cb.nombre AS consorcio_nombre, cb.especies AS consorcio_especies,
            u.nombre AS registrado_por
     FROM muestreos m
     JOIN proyectos p ON p.id = m.proyecto_id
     JOIN clientes c ON c.id = p.cliente_id
     LEFT JOIN puntos_muestreo pm ON pm.id = m.punto_id
     LEFT JOIN biocapsulas b ON b.id = m.biocapsula_id
     LEFT JOIN consorcios_bacterianos cb ON cb.id = b.consorcio_id
     LEFT JOIN usuarios u ON u.id = m.created_by
     WHERE m.id = ?`, id,
  );
  if (!m) return null;

  const parametros = catalogoParametros();
  const mapa = resultadosDe(id);
  m.resultados = parametros.map((p) => {
    const r = mapa[p.codigo] ?? null;
    const valor = r?.valor ?? null;
    return {
      codigo: p.codigo, nombre: p.nombre, simbolo: p.simbolo, unidad: p.unidad,
      tipo: p.tipo, direccion: p.direccion, normativa: p.normativa, clave: !!p.clave,
      valor, valor_texto: r?.valor_texto ?? null, metodo: r?.metodo ?? null,
      nivel: A.clasificar(p, valor),
      cumple: A.cumpleNormativa(p, valor),
      ica: A.subIndice(p, valor),
    };
  });
  const ica = A.promedio(m.resultados.map((r) => r.ica));
  m.ica = ica;
  m.calidad = A.clasificarICA(ica);
  return m;
}

/* ------------------------------ Catálogo (Módulo 8) ------------------------------ */

router.get('/parametros', requiereSesion, (_req, res) => res.json(catalogoParametros()));

/** Límites configurables del semáforo (Módulo 12) — sólo administrador. */
router.put('/parametros/:codigo', requiereSesion, (req, res) => {
  if (req.usuario.rol !== 'administrador') {
    return res.status(403).json({ error: 'Sólo el administrador puede modificar los límites.' });
  }
  const p = get('SELECT * FROM parametros WHERE codigo = ?', req.params.codigo);
  if (!p) return res.status(404).json({ error: 'Parámetro no encontrado.' });
  const b = req.body || {};
  const num = (v, actual) => (v === undefined || v === '' ? actual : (v === null ? null : Number(v)));

  run(
    `UPDATE parametros SET limite_excelente = ?, limite_aceptable = ?,
            rango_ideal_min = ?, rango_ideal_max = ?, rango_min = ?, rango_max = ?,
            normativa = ?, clave = ? WHERE codigo = ?`,
    num(b.limite_excelente, p.limite_excelente), num(b.limite_aceptable, p.limite_aceptable),
    num(b.rango_ideal_min, p.rango_ideal_min), num(b.rango_ideal_max, p.rango_ideal_max),
    num(b.rango_min, p.rango_min), num(b.rango_max, p.rango_max),
    b.normativa !== undefined ? b.normativa : p.normativa,
    b.clave === undefined ? p.clave : (b.clave ? 1 : 0),
    p.codigo,
  );
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Configuró límites de parámetro',
    entidad: 'parametros', entidad_id: p.id, detalle: p.nombre,
  });
  res.json(get('SELECT * FROM parametros WHERE codigo = ?', p.codigo));
});

/* ------------------------------ Muestreos ------------------------------ */

router.get('/', requiereSesion, (req, res) => {
  const filtros = [];
  const params = [];
  if (req.usuario.rol === 'cliente') {
    filtros.push('p.cliente_id = ?');
    params.push(req.usuario.cliente_id ?? -1);
  }
  if (req.query.proyecto_id) {
    filtros.push('m.proyecto_id = ?');
    params.push(Number(req.query.proyecto_id));
  }
  if (req.query.etapa) {
    filtros.push('m.etapa = ?');
    params.push(req.query.etapa);
  }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const muestreos = all(
    `SELECT m.*, p.nombre AS proyecto_nombre, c.nombre AS cliente_nombre,
            pm.codigo AS punto_codigo, b.lote AS biocapsula_lote,
            (SELECT COUNT(*) FROM resultados r WHERE r.muestreo_id = m.id) AS total_resultados
     FROM muestreos m
     JOIN proyectos p ON p.id = m.proyecto_id
     JOIN clientes c ON c.id = p.cliente_id
     LEFT JOIN puntos_muestreo pm ON pm.id = m.punto_id
     LEFT JOIN biocapsulas b ON b.id = m.biocapsula_id
     ${where}
     ORDER BY date(m.fecha_muestreo) DESC, m.codigo DESC`,
    ...params,
  );
  res.json(muestreos);
});

router.get('/:id', requiereSesion, (req, res) => {
  const m = detalleMuestreo(Number(req.params.id));
  if (!m) return res.status(404).json({ error: 'Muestreo no encontrado.' });
  if (!puedeVerProyecto(req, m.proyecto_id)) {
    return res.status(403).json({ error: 'No tiene acceso a este muestreo.' });
  }
  res.json(m);
});

/**
 * Registra un muestreo con sus resultados en una sola operación.
 * body: { proyecto_id, punto_id, etapa, fecha_muestreo, ..., resultados: {codigo: valor} }
 */
router.post('/', requiereEdicion, (req, res) => {
  const b = req.body || {};
  if (!b.proyecto_id || !b.etapa || !b.fecha_muestreo) {
    return res.status(400).json({ error: 'Proyecto, etapa y fecha del muestreo son obligatorios.' });
  }
  if (!['antes', 'despues'].includes(b.etapa)) {
    return res.status(400).json({ error: "La etapa debe ser 'antes' o 'despues'." });
  }
  if (!get('SELECT id FROM proyectos WHERE id = ?', Number(b.proyecto_id))) {
    return res.status(400).json({ error: 'El proyecto indicado no existe.' });
  }

  let codigo = b.codigo;
  if (!codigo) {
    const n = get('SELECT COUNT(*) AS n FROM muestreos WHERE proyecto_id = ?', Number(b.proyecto_id)).n + 1;
    codigo = `Muestra ${String(n).padStart(3, '0')}`;
  }
  if (get('SELECT id FROM muestreos WHERE proyecto_id = ? AND codigo = ?', Number(b.proyecto_id), codigo)) {
    return res.status(409).json({ error: `Ya existe el muestreo "${codigo}" en este proyecto.` });
  }

  const parametros = catalogoParametros();
  const porCodigo = Object.fromEntries(parametros.map((p) => [p.codigo, p]));
  const entradas = b.resultados && typeof b.resultados === 'object' ? b.resultados : {};

  // Validación previa: no escribir nada si un parámetro no existe o el valor es inválido.
  for (const [cod, raw] of Object.entries(entradas)) {
    const p = porCodigo[cod];
    if (!p) return res.status(400).json({ error: `Parámetro desconocido: ${cod}.` });
    if (raw === null || raw === undefined || raw === '') continue;
    if (p.tipo === 'numerico' && !Number.isFinite(Number(raw))) {
      return res.status(400).json({ error: `El valor de ${p.nombre} debe ser numérico.` });
    }
    if (p.tipo === 'numerico' && Number(raw) < 0) {
      return res.status(400).json({ error: `El valor de ${p.nombre} no puede ser negativo.` });
    }
  }

  let id;
  db.exec('BEGIN');
  try {
    const r = run(
      `INSERT INTO muestreos (codigo, proyecto_id, punto_id, etapa, fecha_muestreo, hora,
              responsable, laboratorio, biocapsula_id, dosis_capsulas, tiempo_retencion_h,
              observaciones, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      codigo, Number(b.proyecto_id), b.punto_id ?? null, b.etapa, b.fecha_muestreo,
      b.hora ?? null, b.responsable ?? req.usuario.nombre, b.laboratorio ?? null,
      b.biocapsula_id ?? null, b.dosis_capsulas ?? null, b.tiempo_retencion_h ?? null,
      b.observaciones ?? null, req.usuario.id,
    );
    id = Number(r.lastInsertRowid);

    const insRes = db.prepare(
      `INSERT INTO resultados (muestreo_id, parametro_id, valor, valor_texto, metodo)
       VALUES (?,?,?,?,?)`,
    );
    for (const [cod, raw] of Object.entries(entradas)) {
      const p = porCodigo[cod];
      if (raw === null || raw === undefined || raw === '') continue;
      if (p.tipo === 'cualitativo') insRes.run(id, p.id, null, String(raw), null);
      else insRes.run(id, p.id, Number(raw), null, null);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Registró análisis de agua',
    entidad: 'muestreos', entidad_id: id,
    detalle: `${codigo} — ${b.etapa === 'antes' ? 'Antes' : 'Después'} del tratamiento`,
  });
  res.status(201).json(detalleMuestreo(id));
});

router.put('/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const actual = get('SELECT * FROM muestreos WHERE id = ?', id);
  if (!actual) return res.status(404).json({ error: 'Muestreo no encontrado.' });
  const b = req.body || {};

  const parametros = catalogoParametros();
  const porCodigo = Object.fromEntries(parametros.map((p) => [p.codigo, p]));
  const entradas = b.resultados && typeof b.resultados === 'object' ? b.resultados : null;

  if (entradas) {
    for (const [cod, raw] of Object.entries(entradas)) {
      const p = porCodigo[cod];
      if (!p) return res.status(400).json({ error: `Parámetro desconocido: ${cod}.` });
      if (raw === null || raw === undefined || raw === '') continue;
      if (p.tipo === 'numerico' && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
        return res.status(400).json({ error: `El valor de ${p.nombre} no es válido.` });
      }
    }
  }

  db.exec('BEGIN');
  try {
    run(
      `UPDATE muestreos SET punto_id = ?, etapa = ?, fecha_muestreo = ?, hora = ?, responsable = ?,
              laboratorio = ?, biocapsula_id = ?, dosis_capsulas = ?, tiempo_retencion_h = ?,
              observaciones = ? WHERE id = ?`,
      b.punto_id !== undefined ? b.punto_id : actual.punto_id,
      b.etapa ?? actual.etapa,
      b.fecha_muestreo ?? actual.fecha_muestreo,
      b.hora !== undefined ? b.hora : actual.hora,
      b.responsable !== undefined ? b.responsable : actual.responsable,
      b.laboratorio !== undefined ? b.laboratorio : actual.laboratorio,
      b.biocapsula_id !== undefined ? b.biocapsula_id : actual.biocapsula_id,
      b.dosis_capsulas !== undefined ? b.dosis_capsulas : actual.dosis_capsulas,
      b.tiempo_retencion_h !== undefined ? b.tiempo_retencion_h : actual.tiempo_retencion_h,
      b.observaciones !== undefined ? b.observaciones : actual.observaciones,
      id,
    );

    if (entradas) {
      const upsert = db.prepare(
        `INSERT INTO resultados (muestreo_id, parametro_id, valor, valor_texto)
         VALUES (?,?,?,?)
         ON CONFLICT(muestreo_id, parametro_id)
         DO UPDATE SET valor = excluded.valor, valor_texto = excluded.valor_texto`,
      );
      const borrar = db.prepare('DELETE FROM resultados WHERE muestreo_id = ? AND parametro_id = ?');
      for (const [cod, raw] of Object.entries(entradas)) {
        const p = porCodigo[cod];
        if (raw === null || raw === undefined || raw === '') borrar.run(id, p.id);
        else if (p.tipo === 'cualitativo') upsert.run(id, p.id, null, String(raw));
        else upsert.run(id, p.id, Number(raw), null);
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Actualizó análisis de agua',
    entidad: 'muestreos', entidad_id: id, detalle: actual.codigo,
  });
  res.json(detalleMuestreo(id));
});

router.delete('/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const m = get('SELECT * FROM muestreos WHERE id = ?', id);
  if (!m) return res.status(404).json({ error: 'Muestreo no encontrado.' });
  run('DELETE FROM muestreos WHERE id = ?', id);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Eliminó análisis de agua',
    entidad: 'muestreos', entidad_id: id, detalle: m.codigo,
  });
  res.json({ ok: true });
});

module.exports = { router, detalleMuestreo, catalogoParametros, resultadosDe, puedeVerProyecto };
