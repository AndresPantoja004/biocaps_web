/**
 * Módulo 9 — Consorcios bacterianos (parámetros biológicos del tratamiento)
 * Módulo 10 — Datos de las biocápsulas
 */
const express = require('express');
const { all, get, run, registrarHistorial } = require('../db');
const { requiereSesion, requiereEdicion } = require('../lib/auth');

const router = express.Router();

/** Días restantes de vida útil y estado del lote. */
function estadoLote(b) {
  if (!b.fecha_encapsulacion || !b.vida_util_dias) {
    return { ...b, dias_restantes: null, vigencia: 'Sin datos', vigencia_color: '#98a2b3' };
  }
  const encap = new Date(`${b.fecha_encapsulacion}T00:00:00`);
  const vence = new Date(encap.getTime() + b.vida_util_dias * 86400000);
  const dias = Math.ceil((vence - new Date()) / 86400000);
  let vigencia = 'Vigente';
  let color = '#12b76a';
  if (dias < 0) { vigencia = 'Caducado'; color = '#f04438'; }
  else if (dias <= 15) { vigencia = 'Por caducar'; color = '#f5b544'; }
  return {
    ...b,
    fecha_caducidad: vence.toISOString().slice(0, 10),
    dias_restantes: dias,
    vigencia,
    vigencia_color: color,
  };
}

/* --------------------------- Consorcios bacterianos --------------------------- */

router.get('/consorcios', requiereSesion, (_req, res) => {
  res.json(all(
    `SELECT cb.*, (SELECT COUNT(*) FROM biocapsulas b WHERE b.consorcio_id = cb.id) AS total_lotes
     FROM consorcios_bacterianos cb ORDER BY cb.nombre`,
  ));
});

router.post('/consorcios', requiereEdicion, (req, res) => {
  const b = req.body || {};
  if (!b.nombre) return res.status(400).json({ error: 'El nombre del consorcio es obligatorio.' });
  const r = run(
    `INSERT INTO consorcios_bacterianos (nombre, especies, concentracion_ufc_ml, funcion, descripcion)
     VALUES (?,?,?,?,?)`,
    b.nombre, b.especies ?? null, b.concentracion_ufc_ml ?? null, b.funcion ?? null, b.descripcion ?? null,
  );
  const id = Number(r.lastInsertRowid);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Registró consorcio bacteriano',
    entidad: 'consorcios_bacterianos', entidad_id: id, detalle: b.nombre,
  });
  res.status(201).json(get('SELECT * FROM consorcios_bacterianos WHERE id = ?', id));
});

router.put('/consorcios/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const actual = get('SELECT * FROM consorcios_bacterianos WHERE id = ?', id);
  if (!actual) return res.status(404).json({ error: 'Consorcio no encontrado.' });
  const b = req.body || {};
  run(
    `UPDATE consorcios_bacterianos SET nombre = ?, especies = ?, concentracion_ufc_ml = ?,
            funcion = ?, descripcion = ? WHERE id = ?`,
    b.nombre ?? actual.nombre,
    b.especies !== undefined ? b.especies : actual.especies,
    b.concentracion_ufc_ml !== undefined ? b.concentracion_ufc_ml : actual.concentracion_ufc_ml,
    b.funcion !== undefined ? b.funcion : actual.funcion,
    b.descripcion !== undefined ? b.descripcion : actual.descripcion,
    id,
  );
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Actualizó consorcio bacteriano',
    entidad: 'consorcios_bacterianos', entidad_id: id, detalle: b.nombre ?? actual.nombre,
  });
  res.json(get('SELECT * FROM consorcios_bacterianos WHERE id = ?', id));
});

router.delete('/consorcios/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const c = get('SELECT * FROM consorcios_bacterianos WHERE id = ?', id);
  if (!c) return res.status(404).json({ error: 'Consorcio no encontrado.' });
  run('DELETE FROM consorcios_bacterianos WHERE id = ?', id);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Eliminó consorcio bacteriano',
    entidad: 'consorcios_bacterianos', entidad_id: id, detalle: c.nombre,
  });
  res.json({ ok: true });
});

/* -------------------------------- Biocápsulas -------------------------------- */

const CAMPOS = [
  'lote', 'consorcio_id', 'fecha_encapsulacion', 'vida_util_dias', 'alginato_sodio_pct',
  'cacl2_pct', 'diametro_mm', 'numero_capsulas', 'peso_g', 'concentracion_ufc_ml', 'observaciones',
];

router.get('/', requiereSesion, (_req, res) => {
  const lotes = all(
    `SELECT b.*, cb.nombre AS consorcio_nombre, cb.especies AS consorcio_especies,
            (SELECT COUNT(*) FROM muestreos m WHERE m.biocapsula_id = b.id) AS aplicaciones
     FROM biocapsulas b LEFT JOIN consorcios_bacterianos cb ON cb.id = b.consorcio_id
     ORDER BY date(b.fecha_encapsulacion) DESC, b.id DESC`,
  );
  res.json(lotes.map(estadoLote));
});

router.get('/:id', requiereSesion, (req, res) => {
  const b = get(
    `SELECT b.*, cb.nombre AS consorcio_nombre, cb.especies AS consorcio_especies
     FROM biocapsulas b LEFT JOIN consorcios_bacterianos cb ON cb.id = b.consorcio_id
     WHERE b.id = ?`, Number(req.params.id),
  );
  if (!b) return res.status(404).json({ error: 'Lote de biocápsulas no encontrado.' });
  res.json(estadoLote(b));
});

router.post('/', requiereEdicion, (req, res) => {
  const b = req.body || {};
  if (!b.lote) return res.status(400).json({ error: 'El número de lote es obligatorio.' });
  if (get('SELECT id FROM biocapsulas WHERE lote = ?', b.lote)) {
    return res.status(409).json({ error: `El lote ${b.lote} ya está registrado.` });
  }
  const r = run(
    `INSERT INTO biocapsulas (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
    ...CAMPOS.map((c) => b[c] ?? null),
  );
  const id = Number(r.lastInsertRowid);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Registró lote de biocápsulas',
    entidad: 'biocapsulas', entidad_id: id, detalle: b.lote,
  });
  res.status(201).json(estadoLote(get('SELECT * FROM biocapsulas WHERE id = ?', id)));
});

router.put('/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const actual = get('SELECT * FROM biocapsulas WHERE id = ?', id);
  if (!actual) return res.status(404).json({ error: 'Lote de biocápsulas no encontrado.' });
  const b = req.body || {};
  run(
    `UPDATE biocapsulas SET ${CAMPOS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    ...CAMPOS.map((c) => (b[c] !== undefined ? b[c] : actual[c])), id,
  );
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Actualizó lote de biocápsulas',
    entidad: 'biocapsulas', entidad_id: id, detalle: b.lote ?? actual.lote,
  });
  res.json(estadoLote(get('SELECT * FROM biocapsulas WHERE id = ?', id)));
});

router.delete('/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const lote = get('SELECT * FROM biocapsulas WHERE id = ?', id);
  if (!lote) return res.status(404).json({ error: 'Lote de biocápsulas no encontrado.' });
  run('DELETE FROM biocapsulas WHERE id = ?', id);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Eliminó lote de biocápsulas',
    entidad: 'biocapsulas', entidad_id: id, detalle: lote.lote,
  });
  res.json({ ok: true });
});

module.exports = router;
