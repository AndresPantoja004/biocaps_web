/** Módulo 4 — Clientes */
const express = require('express');
const { all, get, run, registrarHistorial } = require('../db');
const { requiereSesion, requiereEdicion, requiereAdmin } = require('../lib/auth');

const router = express.Router();

const TIPOS = ['Empresa', 'Municipio', 'Industria', 'Ganadería', 'Universidad'];

const CAMPOS = [
  'nombre', 'tipo', 'ruc', 'contacto', 'cargo', 'direccion',
  'ciudad', 'provincia', 'correo', 'telefono', 'notas',
];

router.get('/', requiereSesion, (req, res) => {
  const soloMio = req.usuario.rol === 'cliente' ? 'WHERE c.id = ?' : '';
  const params = req.usuario.rol === 'cliente' ? [req.usuario.cliente_id ?? -1] : [];
  const clientes = all(
    `SELECT c.*,
            (SELECT COUNT(*) FROM proyectos p WHERE p.cliente_id = c.id) AS total_proyectos,
            (SELECT COUNT(*) FROM proyectos p WHERE p.cliente_id = c.id AND p.estado = 'Activo') AS proyectos_activos
     FROM clientes c ${soloMio}
     ORDER BY c.nombre`,
    ...params,
  );
  res.json(clientes);
});

router.get('/tipos', requiereSesion, (_req, res) => res.json(TIPOS));

router.get('/:id', requiereSesion, (req, res) => {
  const id = Number(req.params.id);
  if (req.usuario.rol === 'cliente' && req.usuario.cliente_id !== id) {
    return res.status(403).json({ error: 'No tiene acceso a este cliente.' });
  }
  const cliente = get('SELECT * FROM clientes WHERE id = ?', id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  cliente.proyectos = all(
    `SELECT id, codigo, nombre, ubicacion, tipo_agua, estado, fecha_inicio, fecha_fin
     FROM proyectos WHERE cliente_id = ? ORDER BY fecha_inicio DESC`, id,
  );
  res.json(cliente);
});

router.post('/', requiereEdicion, (req, res) => {
  const b = req.body || {};
  if (!b.nombre || !b.tipo) {
    return res.status(400).json({ error: 'El nombre y el tipo de cliente son obligatorios.' });
  }
  if (!TIPOS.includes(b.tipo)) {
    return res.status(400).json({ error: `Tipo no válido. Use: ${TIPOS.join(', ')}.` });
  }

  const r = run(
    `INSERT INTO clientes (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
    ...CAMPOS.map((c) => b[c] ?? null),
  );
  const id = Number(r.lastInsertRowid);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Registró cliente',
    entidad: 'clientes', entidad_id: id, detalle: `${b.nombre} (${b.tipo})`,
  });
  res.status(201).json(get('SELECT * FROM clientes WHERE id = ?', id));
});

router.put('/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const actual = get('SELECT * FROM clientes WHERE id = ?', id);
  if (!actual) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const b = req.body || {};
  if (b.tipo && !TIPOS.includes(b.tipo)) {
    return res.status(400).json({ error: `Tipo no válido. Use: ${TIPOS.join(', ')}.` });
  }

  run(
    `UPDATE clientes SET ${CAMPOS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    ...CAMPOS.map((c) => (b[c] !== undefined ? b[c] : actual[c])), id,
  );
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Actualizó cliente',
    entidad: 'clientes', entidad_id: id, detalle: b.nombre ?? actual.nombre,
  });
  res.json(get('SELECT * FROM clientes WHERE id = ?', id));
});

router.delete('/:id', requiereAdmin, (req, res) => {
  const id = Number(req.params.id);
  const cliente = get('SELECT * FROM clientes WHERE id = ?', id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const proyectos = get('SELECT COUNT(*) AS n FROM proyectos WHERE cliente_id = ?', id).n;
  if (proyectos > 0) {
    return res.status(409).json({
      error: `No se puede eliminar: el cliente tiene ${proyectos} proyecto(s) asociado(s).`,
    });
  }
  run('DELETE FROM clientes WHERE id = ?', id);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Eliminó cliente',
    entidad: 'clientes', entidad_id: id, detalle: cliente.nombre,
  });
  res.json({ ok: true });
});

module.exports = router;
