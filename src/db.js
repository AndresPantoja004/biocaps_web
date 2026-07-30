/**
 * BioCaps Monitor® — Capa de base de datos (SQLite nativo de Node)
 * Implementa las tablas principales indicadas en el protocolo de desarrollo:
 * usuarios, clientes, proyectos, puntos de muestreo, muestreos, parámetros de
 * calidad de agua, consorcios bacterianos, biocápsulas, resultados, reportes,
 * archivos, fotografías e historial.
 */
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

const DATA_DIR = config.rutaDatos;
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = config.rutaBaseDatos || path.join(DATA_DIR, 'biocaps.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN ('administrador','analista','cliente')),
  cliente_id    INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  cargo         TEXT,
  telefono      TEXT,
  activo        INTEGER NOT NULL DEFAULT 1,
  ultimo_acceso TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS clientes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('Empresa','Municipio','Industria','Ganadería','Universidad')),
  ruc        TEXT,
  contacto   TEXT,
  cargo      TEXT,
  direccion  TEXT,
  ciudad     TEXT,
  provincia  TEXT,
  correo     TEXT,
  telefono   TEXT,
  notas      TEXT,
  activo     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS proyectos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo        TEXT UNIQUE,
  nombre        TEXT NOT NULL,
  cliente_id    INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  ubicacion     TEXT,
  latitud       REAL,
  longitud      REAL,
  tipo_agua     TEXT NOT NULL CHECK (tipo_agua IN ('Doméstica','Industrial','Agrícola','Lixiviados')),
  caudal_m3_dia REAL,
  fecha_inicio  TEXT,
  fecha_fin     TEXT,
  estado        TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Planificado','Activo','Finalizado','Suspendido')),
  descripcion   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS puntos_muestreo (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  proyecto_id  INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  codigo       TEXT NOT NULL,
  nombre       TEXT,
  tipo         TEXT NOT NULL DEFAULT 'Entrada' CHECK (tipo IN ('Entrada','Intermedio','Salida','Cuerpo receptor')),
  latitud      REAL,
  longitud     REAL,
  descripcion  TEXT,
  fotografia_id INTEGER REFERENCES fotografias(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (proyecto_id, codigo)
);

CREATE TABLE IF NOT EXISTS consorcios_bacterianos (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre                TEXT NOT NULL,
  especies              TEXT,
  concentracion_ufc_ml  REAL,
  funcion               TEXT,
  descripcion           TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS biocapsulas (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  lote                  TEXT NOT NULL UNIQUE,
  consorcio_id          INTEGER REFERENCES consorcios_bacterianos(id) ON DELETE SET NULL,
  fecha_encapsulacion   TEXT,
  vida_util_dias        INTEGER,
  alginato_sodio_pct    REAL,
  cacl2_pct             REAL,
  diametro_mm           REAL,
  numero_capsulas       INTEGER,
  peso_g                REAL,
  concentracion_ufc_ml  REAL,
  observaciones         TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS parametros (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo           TEXT NOT NULL UNIQUE,
  nombre           TEXT NOT NULL,
  simbolo          TEXT,
  unidad           TEXT,
  tipo             TEXT NOT NULL DEFAULT 'numerico' CHECK (tipo IN ('numerico','cualitativo')),
  direccion        TEXT NOT NULL DEFAULT 'reducir' CHECK (direccion IN ('reducir','aumentar','rango','cualitativo')),
  limite_excelente REAL,
  limite_aceptable REAL,
  rango_ideal_min  REAL,
  rango_ideal_max  REAL,
  rango_min        REAL,
  rango_max        REAL,
  normativa        TEXT,
  clave            INTEGER NOT NULL DEFAULT 0,
  orden            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS muestreos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo         TEXT NOT NULL,
  proyecto_id    INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  punto_id       INTEGER REFERENCES puntos_muestreo(id) ON DELETE SET NULL,
  etapa          TEXT NOT NULL CHECK (etapa IN ('antes','despues')),
  fecha_muestreo TEXT NOT NULL,
  hora           TEXT,
  responsable    TEXT,
  laboratorio    TEXT,
  biocapsula_id  INTEGER REFERENCES biocapsulas(id) ON DELETE SET NULL,
  dosis_capsulas INTEGER,
  tiempo_retencion_h REAL,
  observaciones  TEXT,
  created_by     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (proyecto_id, codigo)
);

CREATE TABLE IF NOT EXISTS resultados (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  muestreo_id  INTEGER NOT NULL REFERENCES muestreos(id) ON DELETE CASCADE,
  parametro_id INTEGER NOT NULL REFERENCES parametros(id) ON DELETE CASCADE,
  valor        REAL,
  valor_texto  TEXT,
  metodo       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (muestreo_id, parametro_id)
);

CREATE TABLE IF NOT EXISTS reportes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo             TEXT NOT NULL UNIQUE,
  proyecto_id        INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  muestreo_antes_id  INTEGER REFERENCES muestreos(id) ON DELETE SET NULL,
  muestreo_despues_id INTEGER REFERENCES muestreos(id) ON DELETE SET NULL,
  titulo             TEXT,
  resumen_json       TEXT,
  firma_nombre       TEXT,
  firma_cargo        TEXT,
  token              TEXT NOT NULL UNIQUE,
  generado_por       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS fotografias (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entidad      TEXT NOT NULL,
  entidad_id   INTEGER NOT NULL,
  ruta         TEXT NOT NULL,
  nombre       TEXT,
  descripcion  TEXT,
  mime         TEXT,
  tamano       INTEGER,
  subido_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS archivos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entidad      TEXT NOT NULL,
  entidad_id   INTEGER NOT NULL,
  ruta         TEXT NOT NULL,
  nombre       TEXT,
  mime         TEXT,
  tamano       INTEGER,
  subido_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS historial (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario    TEXT,
  accion     TEXT NOT NULL,
  entidad    TEXT,
  entidad_id INTEGER,
  detalle    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS noticias (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo     TEXT NOT NULL,
  resumen    TEXT,
  cuerpo     TEXT,
  etiqueta   TEXT,
  fecha      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_proyectos_cliente ON proyectos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_puntos_proyecto ON puntos_muestreo(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_muestreos_proyecto ON muestreos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_resultados_muestreo ON resultados(muestreo_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial(created_at);
`;

db.exec(SCHEMA);

/**
 * Catálogo de parámetros (Módulo 8) con límites configurables por defecto
 * tomados del TULSMA — Acuerdo Ministerial 097-A, Anexo 1, Tabla 9
 * (descarga a un cuerpo de agua dulce, Ecuador).
 */
const PARAMETROS_BASE = [
  { codigo: 'temperatura', nombre: 'Temperatura', simbolo: 'T', unidad: '°C', direccion: 'rango',
    rango_ideal_min: 18, rango_ideal_max: 30, rango_min: 0, rango_max: 35,
    normativa: '< 35 °C (TULSMA 097-A)', clave: 0, orden: 1 },
  { codigo: 'ph', nombre: 'pH', simbolo: 'pH', unidad: 'upH', direccion: 'rango',
    rango_ideal_min: 6.5, rango_ideal_max: 8.5, rango_min: 6, rango_max: 9,
    normativa: '6 – 9 (TULSMA 097-A)', clave: 1, orden: 2 },
  { codigo: 'oxigeno_disuelto', nombre: 'Oxígeno Disuelto', simbolo: 'OD', unidad: 'mg/L', direccion: 'aumentar',
    limite_excelente: 5, limite_aceptable: 4,
    normativa: '≥ 5 mg/L (criterio de calidad)', clave: 1, orden: 3 },
  { codigo: 'conductividad', nombre: 'Conductividad eléctrica', simbolo: 'CE', unidad: 'µS/cm', direccion: 'reducir',
    limite_excelente: 750, limite_aceptable: 1500,
    normativa: '≤ 1500 µS/cm (referencia)', clave: 0, orden: 4 },
  { codigo: 'turbidez', nombre: 'Turbidez', simbolo: 'Turb', unidad: 'NTU', direccion: 'reducir',
    limite_excelente: 10, limite_aceptable: 20,
    normativa: '≤ 20 NTU (referencia)', clave: 1, orden: 5 },
  { codigo: 'sst', nombre: 'Sólidos Suspendidos Totales', simbolo: 'SST', unidad: 'mg/L', direccion: 'reducir',
    limite_excelente: 65, limite_aceptable: 130,
    normativa: '≤ 130 mg/L (TULSMA 097-A)', clave: 1, orden: 6 },
  { codigo: 'sdt', nombre: 'Sólidos Disueltos Totales', simbolo: 'SDT', unidad: 'mg/L', direccion: 'reducir',
    limite_excelente: 800, limite_aceptable: 1600,
    normativa: '≤ 1600 mg/L (TULSMA 097-A)', clave: 0, orden: 7 },
  { codigo: 'dbo5', nombre: 'Demanda Bioquímica de Oxígeno', simbolo: 'DBO₅', unidad: 'mg/L', direccion: 'reducir',
    limite_excelente: 50, limite_aceptable: 100,
    normativa: '≤ 100 mg/L (TULSMA 097-A)', clave: 1, orden: 8 },
  { codigo: 'dqo', nombre: 'Demanda Química de Oxígeno', simbolo: 'DQO', unidad: 'mg/L', direccion: 'reducir',
    limite_excelente: 100, limite_aceptable: 200,
    normativa: '≤ 200 mg/L (TULSMA 097-A)', clave: 1, orden: 9 },
  { codigo: 'nh4_n', nombre: 'Nitrógeno Amoniacal', simbolo: 'NH₄⁺-N', unidad: 'mg/L', direccion: 'reducir',
    limite_excelente: 15, limite_aceptable: 30,
    normativa: '≤ 30 mg/L (TULSMA 097-A)', clave: 1, orden: 10 },
  { codigo: 'fosforo_total', nombre: 'Fósforo Total', simbolo: 'P-Total', unidad: 'mg/L', direccion: 'reducir',
    limite_excelente: 5, limite_aceptable: 10,
    normativa: '≤ 10 mg/L (TULSMA 097-A)', clave: 1, orden: 11 },
  { codigo: 'coliformes_totales', nombre: 'Coliformes Totales', simbolo: 'CT', unidad: 'NMP/100 mL', direccion: 'reducir',
    limite_excelente: 1000, limite_aceptable: 2000,
    normativa: '≤ 2000 NMP/100 mL (TULSMA 097-A)', clave: 1, orden: 12 },
  { codigo: 'olor', nombre: 'Olor', simbolo: 'Olor', unidad: '—', tipo: 'cualitativo', direccion: 'cualitativo',
    normativa: 'Ausencia de olor ofensivo', clave: 0, orden: 13 },
];

function sembrarParametros() {
  const insert = db.prepare(`
    INSERT INTO parametros (codigo, nombre, simbolo, unidad, tipo, direccion,
      limite_excelente, limite_aceptable, rango_ideal_min, rango_ideal_max,
      rango_min, rango_max, normativa, clave, orden)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(codigo) DO NOTHING
  `);
  for (const p of PARAMETROS_BASE) {
    insert.run(
      p.codigo, p.nombre, p.simbolo ?? null, p.unidad ?? null, p.tipo ?? 'numerico', p.direccion,
      p.limite_excelente ?? null, p.limite_aceptable ?? null,
      p.rango_ideal_min ?? null, p.rango_ideal_max ?? null,
      p.rango_min ?? null, p.rango_max ?? null,
      p.normativa ?? null, p.clave ?? 0, p.orden ?? 0,
    );
  }
}

sembrarParametros();

/* ------------------------------ Utilidades ------------------------------ */

function all(sql, ...params) {
  return db.prepare(sql).all(...params);
}

function get(sql, ...params) {
  return db.prepare(sql).get(...params);
}

function run(sql, ...params) {
  return db.prepare(sql).run(...params);
}

function registrarHistorial({ usuario_id = null, usuario = null, accion, entidad = null, entidad_id = null, detalle = null }) {
  run(
    `INSERT INTO historial (usuario_id, usuario, accion, entidad, entidad_id, detalle)
     VALUES (?,?,?,?,?,?)`,
    usuario_id, usuario, accion, entidad, entidad_id, detalle,
  );
}

module.exports = { db, all, get, run, registrarHistorial, PARAMETROS_BASE, DB_PATH };
