/**
 * BioCaps Monitor® — Configuración de la aplicación
 *
 * Lee las variables de entorno, opcionalmente desde un archivo .env (soporte
 * nativo de Node, sin dependencias). El orden de precedencia es:
 *   variables del entorno real  >  archivo .env  >  valores por defecto.
 */
const path = require('node:path');
const fs = require('node:fs');

const RAIZ = path.join(__dirname, '..');

/* Carga .env sólo si existe; en Docker las variables llegan por el entorno. */
const RUTA_ENV = process.env.BIOCAPS_ENV_FILE || path.join(RAIZ, '.env');
if (fs.existsSync(RUTA_ENV) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(RUTA_ENV);
  } catch (e) {
    console.warn(`[BioCaps] No se pudo leer ${RUTA_ENV}: ${e.message}`);
  }
}

const bool = (valor, porDefecto = false) => {
  if (valor === undefined || valor === '') return porDefecto;
  return ['1', 'true', 'si', 'sí', 'yes', 'on'].includes(String(valor).toLowerCase());
};

const entero = (valor, porDefecto) => {
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) ? n : porDefecto;
};

const entorno = process.env.NODE_ENV || 'development';
const produccion = entorno === 'production';

const config = {
  entorno,
  produccion,

  puerto: entero(process.env.PORT, 3000),
  host: process.env.HOST || '0.0.0.0',

  /** URL pública; se incrusta en los códigos QR de los reportes. */
  url: (process.env.BIOCAPS_URL || '').replace(/\/+$/, ''),

  /** Rutas de datos persistentes (volúmenes en Docker). */
  rutaDatos: process.env.BIOCAPS_DATA_DIR || path.join(RAIZ, 'data'),
  rutaSubidas: process.env.BIOCAPS_UPLOADS_DIR || path.join(RAIZ, 'uploads'),
  rutaBaseDatos: process.env.BIOCAPS_DB || null, // se resuelve en db.js

  /** Secreto de firma de sesiones. En producción debe fijarse explícitamente. */
  secreto: process.env.BIOCAPS_SECRET || null,
  duracionSesionHoras: entero(process.env.BIOCAPS_SESION_HORAS, 12),

  /** Registro público de nuevas organizaciones cliente. */
  registroPublico: bool(process.env.BIOCAPS_REGISTRO_PUBLICO, true),
  /** Si es true, la cuenta nace desactivada hasta que un administrador la aprueba. */
  registroRequiereAprobacion: bool(process.env.BIOCAPS_REGISTRO_APROBACION, false),
  longitudMinimaPassword: entero(process.env.BIOCAPS_PASSWORD_MIN, produccion ? 8 : 6),

  /** Subida de archivos. */
  tamanoMaximoArchivoMB: entero(process.env.BIOCAPS_MAX_ARCHIVO_MB, 8),

  /** Detrás de un proxy inverso (Nginx, Traefik, Caddy…). */
  trasProxy: bool(process.env.BIOCAPS_TRAS_PROXY, produccion),
  /** Cookies sólo por HTTPS. */
  cookieSegura: bool(process.env.BIOCAPS_COOKIE_SEGURA, produccion),

  /** Carga automática de los datos de demostración al arrancar si la base está vacía. */
  semillaAutomatica: bool(process.env.BIOCAPS_SEMILLA_AUTO, false),
};

/* --------------------------- Avisos de producción --------------------------- */

if (produccion) {
  const problemas = [];
  if (!config.secreto) {
    problemas.push(
      'BIOCAPS_SECRET no está definido: se generará uno en disco, pero las sesiones '
      + 'se invalidarán si el contenedor se recrea sin volumen persistente.',
    );
  } else if (config.secreto.length < 32) {
    problemas.push('BIOCAPS_SECRET es demasiado corto: use al menos 32 caracteres.');
  }
  if (!config.url) {
    problemas.push(
      'BIOCAPS_URL no está definido: los códigos QR de los reportes apuntarán al '
      + 'host de la petición en lugar de a su dominio público.',
    );
  }
  for (const p of problemas) console.warn(`[BioCaps] ⚠ ${p}`);
}

module.exports = config;
