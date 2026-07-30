/** Módulo 2 — Login, registro de cuentas y gestión de usuarios */
const express = require('express');
const { all, get, run, db, registrarHistorial } = require('../db');
const {
  hashPassword, verificarPassword, firmarToken, requiereSesion, requiereAdmin, DURACION_MS,
} = require('../lib/auth');
const config = require('../config');

const router = express.Router();

const TIPOS_CLIENTE = ['Empresa', 'Municipio', 'Industria', 'Ganadería', 'Universidad'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.cookieSegura,
  maxAge: DURACION_MS,
});

/**
 * Freno sencillo en memoria contra intentos masivos de login o registro.
 * Suficiente para un despliegue de un solo proceso; detrás de varias réplicas
 * conviene además un límite en el proxy inverso.
 */
const intentos = new Map();

function limitar(clave, maximo, ventanaMs) {
  const ahora = Date.now();
  const registro = intentos.get(clave);
  if (!registro || ahora > registro.hasta) {
    intentos.set(clave, { cuenta: 1, hasta: ahora + ventanaMs });
    return true;
  }
  registro.cuenta++;
  if (intentos.size > 5000) {
    for (const [k, v] of intentos) if (ahora > v.hasta) intentos.delete(k);
  }
  return registro.cuenta <= maximo;
}

function publico(u) {
  if (!u) return null;
  return {
    id: u.id, nombre: u.nombre, email: u.email, rol: u.rol,
    cliente_id: u.cliente_id, cliente_nombre: u.cliente_nombre ?? null,
    cargo: u.cargo, telefono: u.telefono, activo: !!u.activo,
    ultimo_acceso: u.ultimo_acceso, created_at: u.created_at,
  };
}

/** Opciones que la pantalla de acceso necesita conocer antes de iniciar sesión. */
router.get('/opciones', (_req, res) => {
  res.json({
    registro_publico: config.registroPublico,
    requiere_aprobacion: config.registroRequiereAprobacion,
    password_minimo: config.longitudMinimaPassword,
    tipos_cliente: TIPOS_CLIENTE,
    demo_disponible: !!get("SELECT id FROM usuarios WHERE email = 'admin@biocaps.ec'"),
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Ingrese su correo y contraseña.' });
  }
  if (!limitar(`login:${req.ip}`, 20, 5 * 60 * 1000)) {
    return res.status(429).json({
      error: 'Demasiados intentos de acceso. Espere unos minutos e inténtelo de nuevo.',
    });
  }

  const usuario = get(
    `SELECT u.*, c.nombre AS cliente_nombre
     FROM usuarios u LEFT JOIN clientes c ON c.id = u.cliente_id
     WHERE lower(u.email) = lower(?)`,
    String(email).trim(),
  );

  if (!usuario || !verificarPassword(password, usuario.password_hash, usuario.salt)) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }
  if (!usuario.activo) {
    return res.status(403).json({ error: 'Su usuario está desactivado. Contacte al administrador.' });
  }

  run(`UPDATE usuarios SET ultimo_acceso = datetime('now','localtime') WHERE id = ?`, usuario.id);
  registrarHistorial({
    usuario_id: usuario.id, usuario: usuario.nombre, accion: 'Inicio de sesión',
    entidad: 'usuarios', entidad_id: usuario.id, detalle: `Rol: ${usuario.rol}`,
  });

  const token = firmarToken({
    id: usuario.id, nombre: usuario.nombre, email: usuario.email,
    rol: usuario.rol, cliente_id: usuario.cliente_id,
  });

  res.cookie('biocaps_token', token, opcionesCookie());
  res.json({ token, usuario: publico(usuario) });
});

/**
 * Registro público de una nueva organización cliente.
 * Crea la ficha del cliente y la cuenta de acceso con rol "cliente", que sólo
 * puede consultar los datos de su propia organización.
 */
router.post('/registro', (req, res) => {
  if (!config.registroPublico) {
    return res.status(403).json({
      error: 'El registro de nuevas cuentas está deshabilitado. Solicite acceso a BioCaps.',
    });
  }
  // Tope amplio de intentos: un formulario mal llenado no debe dejar fuera al usuario.
  if (!limitar(`registro-intento:${req.ip}`, 30, 60 * 60 * 1000)) {
    return res.status(429).json({
      error: 'Demasiados intentos de registro. Espere unos minutos e inténtelo de nuevo.',
    });
  }

  const b = req.body || {};
  const nombre = String(b.nombre || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const organizacion = String(b.organizacion || '').trim();
  const tipo = String(b.tipo || '').trim();

  if (!nombre || !email || !password || !organizacion || !tipo) {
    return res.status(400).json({
      error: 'Complete su nombre, correo, contraseña, organización y tipo de organización.',
    });
  }
  if (!EMAIL.test(email)) {
    return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
  }
  if (password.length < config.longitudMinimaPassword) {
    return res.status(400).json({
      error: `La contraseña debe tener al menos ${config.longitudMinimaPassword} caracteres.`,
    });
  }
  if (!TIPOS_CLIENTE.includes(tipo)) {
    return res.status(400).json({ error: `Tipo de organización no válido. Use: ${TIPOS_CLIENTE.join(', ')}.` });
  }
  if (get('SELECT id FROM usuarios WHERE lower(email) = ?', email)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico.' });
  }

  // Tope estricto de cuentas efectivamente creadas por origen.
  if (!limitar(`registro-alta:${req.ip}`, 5, 60 * 60 * 1000)) {
    return res.status(429).json({
      error: 'Se alcanzó el número máximo de cuentas creadas desde esta conexión. Inténtelo más tarde.',
    });
  }

  const activo = config.registroRequiereAprobacion ? 0 : 1;
  let usuarioId;

  db.exec('BEGIN');
  try {
    // Reutiliza la ficha si la organización ya está registrada por otro contacto.
    let cliente = get('SELECT id FROM clientes WHERE lower(nombre) = lower(?)', organizacion);
    if (!cliente) {
      const r = run(
        `INSERT INTO clientes (nombre, tipo, contacto, cargo, correo, telefono, ciudad, notas)
         VALUES (?,?,?,?,?,?,?,?)`,
        organizacion, tipo, nombre, b.cargo ?? null, email,
        b.telefono ?? null, b.ciudad ?? null, 'Alta mediante registro en la plataforma.',
      );
      cliente = { id: Number(r.lastInsertRowid) };
    }

    const { hash, salt } = hashPassword(password);
    const r = run(
      `INSERT INTO usuarios (nombre, email, password_hash, salt, rol, cliente_id, cargo, telefono, activo)
       VALUES (?,?,?,?,'cliente',?,?,?,?)`,
      nombre, email, hash, salt, cliente.id, b.cargo ?? null, b.telefono ?? null, activo,
    );
    usuarioId = Number(r.lastInsertRowid);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  registrarHistorial({
    usuario_id: usuarioId, usuario: nombre, accion: 'Registró una cuenta nueva',
    entidad: 'usuarios', entidad_id: usuarioId, detalle: `${organizacion} (${tipo}) · ${email}`,
  });

  if (!activo) {
    return res.status(201).json({
      pendiente: true,
      mensaje: 'Su cuenta fue creada y está pendiente de aprobación por un administrador. '
        + 'Le avisaremos cuando pueda ingresar.',
    });
  }

  const usuario = get(
    `SELECT u.*, c.nombre AS cliente_nombre
     FROM usuarios u LEFT JOIN clientes c ON c.id = u.cliente_id WHERE u.id = ?`, usuarioId,
  );
  const token = firmarToken({
    id: usuario.id, nombre: usuario.nombre, email: usuario.email,
    rol: usuario.rol, cliente_id: usuario.cliente_id,
  });
  res.cookie('biocaps_token', token, opcionesCookie());
  res.status(201).json({ pendiente: false, token, usuario: publico(usuario) });
});

router.post('/logout', (req, res) => {
  if (req.usuario) {
    registrarHistorial({
      usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Cierre de sesión',
      entidad: 'usuarios', entidad_id: req.usuario.id,
    });
  }
  res.clearCookie('biocaps_token');
  res.json({ ok: true });
});

router.get('/yo', requiereSesion, (req, res) => {
  const usuario = get(
    `SELECT u.*, c.nombre AS cliente_nombre
     FROM usuarios u LEFT JOIN clientes c ON c.id = u.cliente_id WHERE u.id = ?`,
    req.usuario.id,
  );
  if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado.' });
  res.json(publico(usuario));
});

router.get('/usuarios', requiereAdmin, (_req, res) => {
  const usuarios = all(
    `SELECT u.*, c.nombre AS cliente_nombre
     FROM usuarios u LEFT JOIN clientes c ON c.id = u.cliente_id
     ORDER BY u.rol, u.nombre`,
  );
  res.json(usuarios.map(publico));
});

router.post('/usuarios', requiereAdmin, (req, res) => {
  const { nombre, email, password, rol, cliente_id, cargo, telefono } = req.body || {};
  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: 'Nombre, correo, contraseña y rol son obligatorios.' });
  }
  if (!['administrador', 'analista', 'cliente'].includes(rol)) {
    return res.status(400).json({ error: 'Rol no válido.' });
  }
  if (String(password).length < config.longitudMinimaPassword) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${config.longitudMinimaPassword} caracteres.` });
  }
  if (get('SELECT id FROM usuarios WHERE lower(email) = lower(?)', String(email).trim())) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
  }

  const { hash, salt } = hashPassword(String(password));
  const r = run(
    `INSERT INTO usuarios (nombre, email, password_hash, salt, rol, cliente_id, cargo, telefono)
     VALUES (?,?,?,?,?,?,?,?)`,
    nombre, String(email).trim(), hash, salt, rol,
    rol === 'cliente' ? (cliente_id ?? null) : null, cargo ?? null, telefono ?? null,
  );

  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Creó usuario',
    entidad: 'usuarios', entidad_id: Number(r.lastInsertRowid), detalle: `${nombre} (${rol})`,
  });
  res.status(201).json(publico(get('SELECT * FROM usuarios WHERE id = ?', Number(r.lastInsertRowid))));
});

router.patch('/usuarios/:id', requiereAdmin, (req, res) => {
  const id = Number(req.params.id);
  const usuario = get('SELECT * FROM usuarios WHERE id = ?', id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const { nombre, rol, cliente_id, cargo, telefono, activo, password } = req.body || {};
  run(
    `UPDATE usuarios SET nombre = ?, rol = ?, cliente_id = ?, cargo = ?, telefono = ?, activo = ?
     WHERE id = ?`,
    nombre ?? usuario.nombre,
    rol ?? usuario.rol,
    (rol ?? usuario.rol) === 'cliente' ? (cliente_id ?? usuario.cliente_id) : null,
    cargo ?? usuario.cargo,
    telefono ?? usuario.telefono,
    activo === undefined ? usuario.activo : (activo ? 1 : 0),
    id,
  );
  if (password) {
    if (String(password).length < config.longitudMinimaPassword) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${config.longitudMinimaPassword} caracteres.` });
    }
    const { hash, salt } = hashPassword(String(password));
    run('UPDATE usuarios SET password_hash = ?, salt = ? WHERE id = ?', hash, salt, id);
  }

  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Actualizó usuario',
    entidad: 'usuarios', entidad_id: id, detalle: nombre ?? usuario.nombre,
  });
  res.json(publico(get('SELECT * FROM usuarios WHERE id = ?', id)));
});

router.post('/cambiar-password', requiereSesion, (req, res) => {
  const { actual, nueva } = req.body || {};
  const usuario = get('SELECT * FROM usuarios WHERE id = ?', req.usuario.id);
  if (!usuario || !verificarPassword(String(actual || ''), usuario.password_hash, usuario.salt)) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }
  if (!nueva || String(nueva).length < config.longitudMinimaPassword) {
    return res.status(400).json({ error: `La nueva contraseña debe tener al menos ${config.longitudMinimaPassword} caracteres.` });
  }
  const { hash, salt } = hashPassword(String(nueva));
  run('UPDATE usuarios SET password_hash = ?, salt = ? WHERE id = ?', hash, salt, usuario.id);
  registrarHistorial({
    usuario_id: usuario.id, usuario: usuario.nombre, accion: 'Cambió su contraseña',
    entidad: 'usuarios', entidad_id: usuario.id,
  });
  res.json({ ok: true });
});

module.exports = router;
