/** Módulos 5 y 6 — Proyectos y Puntos de Muestreo */
const express = require('express');
const { all, get, run, registrarHistorial } = require('../db');
const { requiereSesion, requiereEdicion, requiereAdmin } = require('../lib/auth');

const router = express.Router();

const TIPOS_AGUA = ['Doméstica', 'Industrial', 'Agrícola', 'Lixiviados'];
const ESTADOS = ['Planificado', 'Activo', 'Finalizado', 'Suspendido'];
const TIPOS_PUNTO = ['Entrada', 'Intermedio', 'Salida', 'Cuerpo receptor'];

const CAMPOS = [
  'codigo', 'nombre', 'cliente_id', 'ubicacion', 'latitud', 'longitud',
  'tipo_agua', 'caudal_m3_dia', 'fecha_inicio', 'fecha_fin', 'estado', 'descripcion',
];

/** Restringe el acceso del rol cliente a sus propios proyectos. */
function puedeVer(req, proyecto) {
  if (!proyecto) return false;
  if (req.usuario.rol !== 'cliente') return true;
  return proyecto.cliente_id === req.usuario.cliente_id;
}

router.get('/catalogos', requiereSesion, (_req, res) => {
  res.json({ tipos_agua: TIPOS_AGUA, estados: ESTADOS, tipos_punto: TIPOS_PUNTO });
});

router.get('/', requiereSesion, (req, res) => {
  const filtros = [];
  const params = [];

  if (req.usuario.rol === 'cliente') {
    filtros.push('p.cliente_id = ?');
    params.push(req.usuario.cliente_id ?? -1);
  }
  if (req.query.cliente_id) {
    filtros.push('p.cliente_id = ?');
    params.push(Number(req.query.cliente_id));
  }
  if (req.query.estado) {
    filtros.push('p.estado = ?');
    params.push(req.query.estado);
  }
  if (req.query.tipo_agua) {
    filtros.push('p.tipo_agua = ?');
    params.push(req.query.tipo_agua);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  const proyectos = all(
    `SELECT p.*, c.nombre AS cliente_nombre, c.tipo AS cliente_tipo,
            (SELECT COUNT(*) FROM puntos_muestreo pm WHERE pm.proyecto_id = p.id) AS total_puntos,
            (SELECT COUNT(*) FROM muestreos m WHERE m.proyecto_id = p.id) AS total_muestreos,
            (SELECT COUNT(*) FROM reportes r WHERE r.proyecto_id = p.id) AS total_reportes
     FROM proyectos p
     JOIN clientes c ON c.id = p.cliente_id
     ${where}
     ORDER BY p.estado = 'Activo' DESC, date(p.fecha_inicio) DESC, p.id DESC`,
    ...params,
  );
  res.json(proyectos);
});

router.get('/:id', requiereSesion, (req, res) => {
  const proyecto = get(
    `SELECT p.*, c.nombre AS cliente_nombre, c.tipo AS cliente_tipo, c.contacto AS cliente_contacto,
            c.correo AS cliente_correo, c.telefono AS cliente_telefono, c.direccion AS cliente_direccion
     FROM proyectos p JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?`,
    Number(req.params.id),
  );
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  if (!puedeVer(req, proyecto)) return res.status(403).json({ error: 'No tiene acceso a este proyecto.' });

  proyecto.puntos = all(
    `SELECT pm.*, f.ruta AS fotografia_ruta
     FROM puntos_muestreo pm LEFT JOIN fotografias f ON f.id = pm.fotografia_id
     WHERE pm.proyecto_id = ? ORDER BY pm.codigo`, proyecto.id,
  );
  proyecto.muestreos = all(
    `SELECT m.*, pm.codigo AS punto_codigo, b.lote AS biocapsula_lote
     FROM muestreos m
     LEFT JOIN puntos_muestreo pm ON pm.id = m.punto_id
     LEFT JOIN biocapsulas b ON b.id = m.biocapsula_id
     WHERE m.proyecto_id = ? ORDER BY date(m.fecha_muestreo) DESC, m.codigo DESC`, proyecto.id,
  );
  res.json(proyecto);
});

router.post('/', requiereEdicion, (req, res) => {
  const b = req.body || {};
  if (!b.nombre || !b.cliente_id || !b.tipo_agua) {
    return res.status(400).json({ error: 'Nombre, cliente y tipo de agua son obligatorios.' });
  }
  if (!TIPOS_AGUA.includes(b.tipo_agua)) {
    return res.status(400).json({ error: `Tipo de agua no válido. Use: ${TIPOS_AGUA.join(', ')}.` });
  }
  if (b.estado && !ESTADOS.includes(b.estado)) {
    return res.status(400).json({ error: `Estado no válido. Use: ${ESTADOS.join(', ')}.` });
  }
  if (!get('SELECT id FROM clientes WHERE id = ?', Number(b.cliente_id))) {
    return res.status(400).json({ error: 'El cliente indicado no existe.' });
  }

  const datos = { ...b, estado: b.estado || 'Activo' };
  if (!datos.codigo) {
    const n = get('SELECT COUNT(*) AS n FROM proyectos').n + 1;
    datos.codigo = `PRY-${String(n).padStart(3, '0')}`;
  }
  if (get('SELECT id FROM proyectos WHERE codigo = ?', datos.codigo)) {
    return res.status(409).json({ error: `Ya existe un proyecto con el código ${datos.codigo}.` });
  }

  const r = run(
    `INSERT INTO proyectos (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
    ...CAMPOS.map((c) => datos[c] ?? null),
  );
  const id = Number(r.lastInsertRowid);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Registró proyecto',
    entidad: 'proyectos', entidad_id: id, detalle: `${datos.nombre} — ${datos.tipo_agua}`,
  });
  res.status(201).json(get('SELECT * FROM proyectos WHERE id = ?', id));
});

router.put('/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const actual = get('SELECT * FROM proyectos WHERE id = ?', id);
  if (!actual) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  const b = req.body || {};
  if (b.tipo_agua && !TIPOS_AGUA.includes(b.tipo_agua)) {
    return res.status(400).json({ error: `Tipo de agua no válido. Use: ${TIPOS_AGUA.join(', ')}.` });
  }
  if (b.estado && !ESTADOS.includes(b.estado)) {
    return res.status(400).json({ error: `Estado no válido. Use: ${ESTADOS.join(', ')}.` });
  }

  run(
    `UPDATE proyectos SET ${CAMPOS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    ...CAMPOS.map((c) => (b[c] !== undefined ? b[c] : actual[c])), id,
  );
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Actualizó proyecto',
    entidad: 'proyectos', entidad_id: id, detalle: b.nombre ?? actual.nombre,
  });
  res.json(get('SELECT * FROM proyectos WHERE id = ?', id));
});

router.delete('/:id', requiereAdmin, (req, res) => {
  const id = Number(req.params.id);
  const proyecto = get('SELECT * FROM proyectos WHERE id = ?', id);
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  run('DELETE FROM proyectos WHERE id = ?', id);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Eliminó proyecto',
    entidad: 'proyectos', entidad_id: id, detalle: proyecto.nombre,
  });
  res.json({ ok: true });
});

/* ------------------------ Módulo 6: Puntos de muestreo ------------------------ */

router.get('/:id/puntos', requiereSesion, (req, res) => {
  const proyecto = get('SELECT * FROM proyectos WHERE id = ?', Number(req.params.id));
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  if (!puedeVer(req, proyecto)) return res.status(403).json({ error: 'No tiene acceso a este proyecto.' });

  res.json(all(
    `SELECT pm.*, f.ruta AS fotografia_ruta,
            (SELECT COUNT(*) FROM muestreos m WHERE m.punto_id = pm.id) AS total_muestreos
     FROM puntos_muestreo pm LEFT JOIN fotografias f ON f.id = pm.fotografia_id
     WHERE pm.proyecto_id = ? ORDER BY pm.codigo`, proyecto.id,
  ));
});

router.post('/:id/puntos', requiereEdicion, (req, res) => {
  const proyecto_id = Number(req.params.id);
  if (!get('SELECT id FROM proyectos WHERE id = ?', proyecto_id)) {
    return res.status(404).json({ error: 'Proyecto no encontrado.' });
  }
  const b = req.body || {};
  if (!b.codigo) return res.status(400).json({ error: 'El código del punto es obligatorio.' });
  if (b.tipo && !TIPOS_PUNTO.includes(b.tipo)) {
    return res.status(400).json({ error: `Tipo de punto no válido. Use: ${TIPOS_PUNTO.join(', ')}.` });
  }
  if (get('SELECT id FROM puntos_muestreo WHERE proyecto_id = ? AND codigo = ?', proyecto_id, b.codigo)) {
    return res.status(409).json({ error: `El punto ${b.codigo} ya existe en este proyecto.` });
  }

  const r = run(
    `INSERT INTO puntos_muestreo (proyecto_id, codigo, nombre, tipo, latitud, longitud, descripcion, fotografia_id)
     VALUES (?,?,?,?,?,?,?,?)`,
    proyecto_id, b.codigo, b.nombre ?? null, b.tipo || 'Entrada',
    b.latitud ?? null, b.longitud ?? null, b.descripcion ?? null, b.fotografia_id ?? null,
  );
  const id = Number(r.lastInsertRowid);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Registró punto de muestreo',
    entidad: 'puntos_muestreo', entidad_id: id, detalle: `${b.codigo} (proyecto ${proyecto_id})`,
  });
  res.status(201).json(get('SELECT * FROM puntos_muestreo WHERE id = ?', id));
});

router.put('/puntos/:puntoId', requiereEdicion, (req, res) => {
  const id = Number(req.params.puntoId);
  const actual = get('SELECT * FROM puntos_muestreo WHERE id = ?', id);
  if (!actual) return res.status(404).json({ error: 'Punto de muestreo no encontrado.' });
  const b = req.body || {};
  if (b.tipo && !TIPOS_PUNTO.includes(b.tipo)) {
    return res.status(400).json({ error: `Tipo de punto no válido. Use: ${TIPOS_PUNTO.join(', ')}.` });
  }

  run(
    `UPDATE puntos_muestreo SET codigo = ?, nombre = ?, tipo = ?, latitud = ?, longitud = ?,
            descripcion = ?, fotografia_id = ? WHERE id = ?`,
    b.codigo ?? actual.codigo, b.nombre !== undefined ? b.nombre : actual.nombre,
    b.tipo ?? actual.tipo,
    b.latitud !== undefined ? b.latitud : actual.latitud,
    b.longitud !== undefined ? b.longitud : actual.longitud,
    b.descripcion !== undefined ? b.descripcion : actual.descripcion,
    b.fotografia_id !== undefined ? b.fotografia_id : actual.fotografia_id,
    id,
  );
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Actualizó punto de muestreo',
    entidad: 'puntos_muestreo', entidad_id: id, detalle: b.codigo ?? actual.codigo,
  });
  res.json(get('SELECT * FROM puntos_muestreo WHERE id = ?', id));
});

router.delete('/puntos/:puntoId', requiereEdicion, (req, res) => {
  const id = Number(req.params.puntoId);
  const punto = get('SELECT * FROM puntos_muestreo WHERE id = ?', id);
  if (!punto) return res.status(404).json({ error: 'Punto de muestreo no encontrado.' });
  run('DELETE FROM puntos_muestreo WHERE id = ?', id);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Eliminó punto de muestreo',
    entidad: 'puntos_muestreo', entidad_id: id, detalle: punto.codigo,
  });
  res.json({ ok: true });
});

module.exports = router;
