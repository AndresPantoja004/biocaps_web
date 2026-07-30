/**
 * BioCaps Monitor® — Servidor de la plataforma
 * Plataforma inteligente de monitoreo de tratamiento de aguas residuales
 * con biocápsulas de alginato y consorcios bacterianos.
 *
 * Arranque:  npm start        (http://localhost:3000)
 * Semilla:   npm run seed     (proyecto de ejemplo: PTAR Santo Domingo)
 */

// El módulo node:sqlite emite un aviso experimental que no aporta al usuario final.
const avisoOriginal = process.emitWarning;
process.emitWarning = function (aviso, ...resto) {
  const texto = typeof aviso === 'string' ? aviso : aviso?.message || '';
  if (/SQLite is an experimental feature/i.test(texto)) return;
  return avisoOriginal.call(process, aviso, ...resto);
};

const path = require('node:path');
const express = require('express');

const config = require('./src/config');
const { cargarSesion, cookieParser } = require('./src/lib/auth');
const authRouter = require('./src/routes/auth');
const clientesRouter = require('./src/routes/clientes');
const proyectosRouter = require('./src/routes/proyectos');
const { router: muestreosRouter } = require('./src/routes/muestreos');
const { router: analisisRouter } = require('./src/routes/analisis');
const biocapsulasRouter = require('./src/routes/biocapsulas');
const dashboardRouter = require('./src/routes/dashboard');
const reportesRouter = require('./src/routes/reportes');
const archivosRouter = require('./src/routes/archivos');
const historialRouter = require('./src/routes/historial');
const publicoRouter = require('./src/routes/publico');

const app = express();

app.disable('x-powered-by');

// Detrás de un proxy inverso, req.ip y req.protocol deben venir de las
// cabeceras X-Forwarded-*; de lo contrario el QR apuntaría a http y el
// limitador de intentos vería una sola IP para todo el mundo.
if (config.trasProxy) app.set('trust proxy', 1);

/** Cabeceras de seguridad básicas, sin dependencias externas. */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (config.produccion) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser);
app.use(cargarSesion);

/* ------------------------------- API ------------------------------- */
app.use('/api/publico', publicoRouter);
app.use('/api/auth', authRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/proyectos', proyectosRouter);
app.use('/api/muestreos', muestreosRouter);
app.use('/api/analisis', analisisRouter);
app.use('/api/biocapsulas', biocapsulasRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/archivos', archivosRouter);
app.use('/api/historial', historialRouter);

app.get('/api/salud', (_req, res) => {
  res.json({
    ok: true,
    plataforma: 'BioCaps Monitor®',
    version: require('./package.json').version,
    entorno: config.entorno,
  });
});

/* --------------------------- Archivos estáticos --------------------------- */
app.use('/uploads', express.static(config.rutaSubidas, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

/* ------------------------------- Vistas ------------------------------- */
app.get('/app', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/verificar/:token', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'verificar.html')));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Recurso no encontrado: ${req.method} ${req.path}` });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* --------------------------- Manejo de errores --------------------------- */
app.use((err, _req, res, _next) => {
  console.error('[BioCaps] Error:', err.message);
  if (res.headersSent) return;
  const mensaje = err.message?.includes('UNIQUE constraint')
    ? 'Ya existe un registro con esos datos únicos.'
    : err.message?.includes('FOREIGN KEY constraint')
      ? 'La operación viola una relación de la base de datos (verifique los datos asociados).'
      : 'Ocurrió un error al procesar la solicitud.';
  res.status(500).json({
    error: mensaje,
    detalle: config.produccion ? undefined : err.message,
  });
});

/* ------------------------- Semilla automática opcional ------------------------- */
if (config.semillaAutomatica) {
  const { get } = require('./src/db');
  if (get('SELECT COUNT(*) AS n FROM clientes').n === 0) {
    console.log('[BioCaps] Base vacía y BIOCAPS_SEMILLA_AUTO activo: cargando la demostración…');
    try {
      require('./src/seed');
    } catch (e) {
      console.error('[BioCaps] No se pudo cargar la semilla:', e.message);
    }
  }
}

const servidor = app.listen(config.puerto, config.host, () => {
  const url = config.url || `http://localhost:${config.puerto}`;
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════╗');
  console.log('  ║              B i o C a p s   M o n i t o r ®           ║');
  console.log('  ║    Monitoreo inteligente de tratamiento de aguas       ║');
  console.log('  ╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Entorno       ${config.entorno}`);
  console.log(`  Escuchando    ${config.host}:${config.puerto}`);
  console.log(`  Inicio        ${url}/`);
  console.log(`  Plataforma    ${url}/app`);
  console.log(`  Registro      ${config.registroPublico
    ? (config.registroRequiereAprobacion ? 'abierto (requiere aprobación)' : 'abierto')
    : 'cerrado'}`);
  if (!config.produccion) {
    console.log('');
    console.log('  Usuarios de demostración (npm run seed):');
    console.log('    administrador   admin@biocaps.ec          / biocaps2026');
    console.log('    analista        analista@biocaps.ec       / biocaps2026');
    console.log('    cliente         cliente@emapasd.gob.ec    / biocaps2026');
  }
  console.log('');
});

/** Apagado ordenado: deja terminar las peticiones en curso. */
let cerrando = false;
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    if (cerrando) return;
    cerrando = true;
    console.log(`\n[BioCaps] ${senal} recibido, cerrando servidor…`);
    servidor.close(() => {
      console.log('[BioCaps] Servidor cerrado.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}

module.exports = app;
