/**
 * BioCaps Monitor® — Autenticación y control de acceso por roles (Módulo 2)
 * Roles: administrador · analista · cliente
 *
 * Contraseñas: scrypt + salt aleatorio por usuario.
 * Sesión: token firmado con HMAC-SHA256 (sin estado en servidor).
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

const SECRET_FILE = path.join(config.rutaDatos, '.session-secret');

function obtenerSecreto() {
  if (config.secreto) return config.secreto;
  try {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } catch {
    const s = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
    return s;
  }
}

const SECRET = obtenerSecreto();
const DURACION_MS = config.duracionSesionHoras * 60 * 60 * 1000;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verificarPassword(password, hash, salt) {
  const intento = crypto.scryptSync(password, salt, 64);
  const guardado = Buffer.from(hash, 'hex');
  if (intento.length !== guardado.length) return false;
  return crypto.timingSafeEqual(intento, guardado);
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function firmarToken(payload) {
  const cuerpo = base64url(JSON.stringify({ ...payload, exp: Date.now() + DURACION_MS }));
  const firma = crypto.createHmac('sha256', SECRET).update(cuerpo).digest('base64url');
  return `${cuerpo}.${firma}`;
}

function verificarToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [cuerpo, firma] = token.split('.');
  const esperada = crypto.createHmac('sha256', SECRET).update(cuerpo).digest('base64url');
  const a = Buffer.from(firma || '');
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Middleware: adjunta req.usuario si el token es válido. */
function cargarSesion(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.biocaps_token;
  req.usuario = verificarToken(token);
  next();
}

/** Middleware: exige sesión y, opcionalmente, uno de los roles indicados. */
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Sesión no válida o expirada. Vuelva a iniciar sesión.' });
    }
    if (roles.length && !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Su rol no tiene permisos para esta operación.' });
    }
    next();
  };
}

const requiereSesion = requiereRol();
/** Escritura de datos: administrador y analista. El cliente sólo consulta. */
const requiereEdicion = requiereRol('administrador', 'analista');
const requiereAdmin = requiereRol('administrador');

/** Parser mínimo de cookies (evita una dependencia extra). */
function cookieParser(req, _res, next) {
  const raw = req.headers.cookie;
  req.cookies = {};
  if (raw) {
    for (const parte of raw.split(';')) {
      const i = parte.indexOf('=');
      if (i > -1) req.cookies[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
    }
  }
  next();
}

module.exports = {
  hashPassword,
  verificarPassword,
  firmarToken,
  verificarToken,
  cargarSesion,
  requiereRol,
  requiereSesion,
  requiereEdicion,
  requiereAdmin,
  cookieParser,
  DURACION_MS,
};
