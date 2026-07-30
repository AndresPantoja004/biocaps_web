/**
 * BioCaps Monitor® — Carga del proyecto de demostración
 *
 * Simula un caso real: la planta de tratamiento de aguas residuales de
 * Santo Domingo, con seis campañas mensuales de muestreo antes y después
 * del tratamiento con biocápsulas, más otros proyectos de distinto tipo de agua.
 *
 * Los datos son de DEMOSTRACIÓN académica: las organizaciones son ficticias
 * y los valores replican rangos típicos de literatura, incluido el ejemplo del
 * protocolo (NH₄⁺-N 120 → 18 mg/L = 85 % de remoción).
 *
 *   npm run seed          carga si la base está vacía
 *   npm run reset         borra todo y vuelve a cargar
 */
const avisoOriginal = process.emitWarning;
process.emitWarning = function (aviso, ...resto) {
  const texto = typeof aviso === 'string' ? aviso : aviso?.message || '';
  if (/SQLite is an experimental feature/i.test(texto)) return;
  return avisoOriginal.call(process, aviso, ...resto);
};

const { db, all, get, run } = require('./db');
const { hashPassword } = require('./lib/auth');
const A = require('./lib/analisis');
const crypto = require('node:crypto');

const RESET = process.argv.includes('--reset');

const TABLAS = [
  'resultados', 'reportes', 'muestreos', 'puntos_muestreo', 'proyectos',
  'biocapsulas', 'consorcios_bacterianos', 'fotografias', 'archivos',
  'usuarios', 'clientes', 'historial', 'noticias',
];

function limpiar() {
  db.exec('PRAGMA foreign_keys = OFF');
  for (const t of TABLAS) db.exec(`DELETE FROM ${t}`);
  db.exec("DELETE FROM sqlite_sequence WHERE name NOT IN ('parametros')");
  db.exec('PRAGMA foreign_keys = ON');
}

if (get('SELECT COUNT(*) AS n FROM clientes').n > 0) {
  if (!RESET) {
    console.log('[seed] La base ya contiene datos. Use "npm run reset" para recargarla desde cero.');
    process.exit(0);
  }
  console.log('[seed] Borrando datos existentes…');
  limpiar();
}

const PASSWORD_DEMO = 'biocaps2026';

/* ------------------------------- Clientes (Módulo 4) ------------------------------- */

const clientes = [
  {
    nombre: 'EMAPA Santo Domingo EP', tipo: 'Municipio', ruc: '1768152340001',
    contacto: 'Ing. Rocío Villavicencio', cargo: 'Directora de Saneamiento Ambiental',
    direccion: 'Av. Tsáchila y Río Toachi, Santo Domingo', ciudad: 'Santo Domingo',
    provincia: 'Santo Domingo de los Tsáchilas', correo: 'saneamiento@emapasd.gob.ec',
    telefono: '(02) 275-1420',
    notas: 'Operadora de la PTAR municipal. Convenio de innovación tecnológica con BioCaps.',
  },
  {
    nombre: 'Lácteos El Tsáchila Cía. Ltda.', tipo: 'Industria', ruc: '1791234567001',
    contacto: 'Ing. Marco Loor', cargo: 'Jefe de Producción',
    direccion: 'Km 12 vía Quevedo, parque industrial', ciudad: 'Santo Domingo',
    provincia: 'Santo Domingo de los Tsáchilas', correo: 'produccion@lacteoseltsachila.ec',
    telefono: '(02) 274-8890',
    notas: 'Efluente con alta carga orgánica y grasas provenientes del lavado de tanques.',
  },
  {
    nombre: 'Hacienda Ganadera San Jacinto', tipo: 'Ganadería', ruc: '1712345678001',
    contacto: 'Sr. Julio Chérrez', cargo: 'Administrador',
    direccion: 'Recinto San Jacinto del Búa', ciudad: 'Santo Domingo',
    provincia: 'Santo Domingo de los Tsáchilas', correo: 'admin@haciendasanjacinto.ec',
    telefono: '099 812 4477',
    notas: 'Tratamiento de purines de establo con 340 cabezas de ganado.',
  },
  {
    nombre: 'Universidad Politécnica del Trópico', tipo: 'Universidad', ruc: '1760009870001',
    contacto: 'Dra. Elena Mosquera', cargo: 'Directora de Investigación',
    direccion: 'Campus Central, vía Chone', ciudad: 'Santo Domingo',
    provincia: 'Santo Domingo de los Tsáchilas', correo: 'investigacion@upt.edu.ec',
    telefono: '(02) 237-5600',
    notas: 'Convenio de investigación conjunta para la caracterización de consorcios bacterianos.',
  },
  {
    nombre: 'Agroindustrial Palmar del Río S.A.', tipo: 'Empresa', ruc: '1790123456001',
    contacto: 'Ing. Diana Zambrano', cargo: 'Coordinadora Ambiental',
    direccion: 'Km 38 vía Esmeraldas', ciudad: 'La Concordia',
    provincia: 'Santo Domingo de los Tsáchilas', correo: 'ambiental@palmardelrio.com.ec',
    telefono: '(02) 272-3311',
    notas: 'Extractora de aceite de palma; efluentes de alta DQO.',
  },
];

const clienteIds = clientes.map((c) => {
  const r = run(
    `INSERT INTO clientes (nombre, tipo, ruc, contacto, cargo, direccion, ciudad, provincia, correo, telefono, notas)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    c.nombre, c.tipo, c.ruc, c.contacto, c.cargo, c.direccion, c.ciudad, c.provincia, c.correo, c.telefono, c.notas,
  );
  return Number(r.lastInsertRowid);
});

/* ------------------------------- Usuarios (Módulo 2) ------------------------------- */

const usuarios = [
  { nombre: 'Ing. David Andrés Cevallos', email: 'admin@biocaps.ec', rol: 'administrador',
    cargo: 'Gerente técnico BioCaps', telefono: '098 776 1204' },
  { nombre: 'Blga. Karla Intriago', email: 'analista@biocaps.ec', rol: 'analista',
    cargo: 'Analista de laboratorio', telefono: '096 331 8890' },
  { nombre: 'Ing. Fausto Paredes', email: 'analista2@biocaps.ec', rol: 'analista',
    cargo: 'Analista de campo', telefono: '099 120 4471' },
  { nombre: 'Ing. Rocío Villavicencio', email: 'cliente@emapasd.gob.ec', rol: 'cliente',
    cliente_id: clienteIds[0], cargo: 'Directora de Saneamiento Ambiental', telefono: '(02) 275-1420' },
];

for (const u of usuarios) {
  const { hash, salt } = hashPassword(PASSWORD_DEMO);
  run(
    `INSERT INTO usuarios (nombre, email, password_hash, salt, rol, cliente_id, cargo, telefono)
     VALUES (?,?,?,?,?,?,?,?)`,
    u.nombre, u.email, hash, salt, u.rol, u.cliente_id ?? null, u.cargo, u.telefono,
  );
}
const adminId = get("SELECT id FROM usuarios WHERE email = 'admin@biocaps.ec'").id;
const analistaId = get("SELECT id FROM usuarios WHERE email = 'analista@biocaps.ec'").id;

/* -------------------- Consorcios bacterianos y biocápsulas (Módulos 9-10) -------------------- */

const consorcios = [
  { nombre: 'Consorcio BC-N1 · Nitrificante',
    especies: 'Nitrosomonas europaea, Nitrobacter winogradskyi, Nitrospira sp.',
    concentracion_ufc_ml: 1.2e9, funcion: 'Oxidación de nitrógeno amoniacal a nitrito y nitrato',
    descripcion: 'Consorcio autótrofo seleccionado para remoción de NH₄⁺-N en efluentes domésticos.' },
  { nombre: 'Consorcio BC-O2 · Degradador de materia orgánica',
    especies: 'Bacillus subtilis, Pseudomonas putida, Rhodococcus erythropolis',
    concentracion_ufc_ml: 2.5e9, funcion: 'Degradación de DBO₅ y DQO, hidrólisis de grasas',
    descripcion: 'Consorcio heterótrofo de alto rendimiento para cargas orgánicas industriales.' },
  { nombre: 'Consorcio BC-P3 · Acumulador de fósforo',
    especies: 'Acinetobacter johnsonii, Bacillus licheniformis',
    concentracion_ufc_ml: 8.0e8, funcion: 'Acumulación intracelular de fosfatos',
    descripcion: 'Aplicado en efluentes con riesgo de eutrofización del cuerpo receptor.' },
  { nombre: 'Consorcio BC-M4 · Mixto para lixiviados',
    especies: 'Pseudomonas aeruginosa, Bacillus cereus, Enterobacter cloacae, Aspergillus niger',
    concentracion_ufc_ml: 3.1e9, funcion: 'Degradación de compuestos recalcitrantes y ácidos húmicos',
    descripcion: 'Formulación robusta para lixiviados de relleno sanitario.' },
];

const consorcioIds = consorcios.map((c) => Number(run(
  `INSERT INTO consorcios_bacterianos (nombre, especies, concentracion_ufc_ml, funcion, descripcion)
   VALUES (?,?,?,?,?)`,
  c.nombre, c.especies, c.concentracion_ufc_ml, c.funcion, c.descripcion,
).lastInsertRowid));

const lotes = [
  { lote: 'BC-2026-001', consorcio_id: consorcioIds[0], fecha_encapsulacion: '2026-02-02', vida_util_dias: 90,
    alginato_sodio_pct: 2.0, cacl2_pct: 2.0, diametro_mm: 3.5, numero_capsulas: 15000, peso_g: 452.6,
    concentracion_ufc_ml: 1.2e9, observaciones: 'Lote piloto para la PTAR municipal. Esferas homogéneas, sin ruptura.' },
  { lote: 'BC-2026-002', consorcio_id: consorcioIds[1], fecha_encapsulacion: '2026-03-05', vida_util_dias: 90,
    alginato_sodio_pct: 2.5, cacl2_pct: 2.0, diametro_mm: 4.0, numero_capsulas: 12000, peso_g: 498.1,
    concentracion_ufc_ml: 2.5e9, observaciones: 'Formulación reforzada para efluente lácteo.' },
  { lote: 'BC-2026-003', consorcio_id: consorcioIds[0], fecha_encapsulacion: '2026-04-08', vida_util_dias: 90,
    alginato_sodio_pct: 2.0, cacl2_pct: 2.5, diametro_mm: 3.2, numero_capsulas: 18000, peso_g: 510.4,
    concentracion_ufc_ml: 1.4e9, observaciones: 'Reticulación aumentada; mayor resistencia mecánica.' },
  { lote: 'BC-2026-004', consorcio_id: consorcioIds[3], fecha_encapsulacion: '2026-05-11', vida_util_dias: 120,
    alginato_sodio_pct: 3.0, cacl2_pct: 3.0, diametro_mm: 4.5, numero_capsulas: 9000, peso_g: 421.8,
    concentracion_ufc_ml: 3.1e9, observaciones: 'Lote para lixiviados; matriz de mayor densidad.' },
  { lote: 'BC-2026-005', consorcio_id: consorcioIds[2], fecha_encapsulacion: '2026-06-15', vida_util_dias: 90,
    alginato_sodio_pct: 2.2, cacl2_pct: 2.0, diametro_mm: 3.6, numero_capsulas: 14000, peso_g: 470.2,
    concentracion_ufc_ml: 8.0e8, observaciones: 'Ensayo de remoción de fósforo en purines.' },
  { lote: 'BC-2026-006', consorcio_id: consorcioIds[0], fecha_encapsulacion: '2026-07-06', vida_util_dias: 90,
    alginato_sodio_pct: 2.0, cacl2_pct: 2.0, diametro_mm: 3.4, numero_capsulas: 16500, peso_g: 489.7,
    concentracion_ufc_ml: 1.6e9, observaciones: 'Lote vigente en operación en la PTAR municipal.' },
];

const loteIds = lotes.map((l) => Number(run(
  `INSERT INTO biocapsulas (lote, consorcio_id, fecha_encapsulacion, vida_util_dias, alginato_sodio_pct,
          cacl2_pct, diametro_mm, numero_capsulas, peso_g, concentracion_ufc_ml, observaciones)
   VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  l.lote, l.consorcio_id, l.fecha_encapsulacion, l.vida_util_dias, l.alginato_sodio_pct,
  l.cacl2_pct, l.diametro_mm, l.numero_capsulas, l.peso_g, l.concentracion_ufc_ml, l.observaciones,
).lastInsertRowid));

/* ------------------------------- Proyectos (Módulo 5) ------------------------------- */

const proyectos = [
  { codigo: 'PRY-001', nombre: 'PTAR Municipal Santo Domingo — Módulo biológico con biocápsulas',
    cliente_id: clienteIds[0], ubicacion: 'PTAR Bombolí, Santo Domingo de los Tsáchilas',
    latitud: -0.2542, longitud: -79.1750, tipo_agua: 'Doméstica', caudal_m3_dia: 4800,
    fecha_inicio: '2026-02-05', fecha_fin: null, estado: 'Activo',
    descripcion: 'Implementación de un reactor de lecho de biocápsulas en el tren de tratamiento secundario '
      + 'de la PTAR municipal, con monitoreo mensual de 13 parámetros antes y después del tratamiento.' },
  { codigo: 'PRY-002', nombre: 'Tratamiento de efluentes de planta láctea',
    cliente_id: clienteIds[1], ubicacion: 'Km 12 vía Quevedo, Santo Domingo',
    latitud: -0.2833, longitud: -79.2411, tipo_agua: 'Industrial', caudal_m3_dia: 180,
    fecha_inicio: '2026-03-10', fecha_fin: null, estado: 'Activo',
    descripcion: 'Reducción de carga orgánica y grasas del lavado de tanques y pasteurizadores.' },
  { codigo: 'PRY-003', nombre: 'Biorremediación de lixiviados del relleno sanitario',
    cliente_id: clienteIds[0], ubicacion: 'Relleno sanitario municipal, vía Chone km 7',
    latitud: -0.2196, longitud: -79.2588, tipo_agua: 'Lixiviados', caudal_m3_dia: 45,
    fecha_inicio: '2026-05-14', fecha_fin: null, estado: 'Activo',
    descripcion: 'Tratamiento de lixiviados de alta DQO mediante consorcio mixto encapsulado BC-M4.' },
  { codigo: 'PRY-004', nombre: 'Manejo de purines de establo — Hacienda San Jacinto',
    cliente_id: clienteIds[2], ubicacion: 'Recinto San Jacinto del Búa',
    latitud: -0.1483, longitud: -79.3597, tipo_agua: 'Agrícola', caudal_m3_dia: 22,
    fecha_inicio: '2026-04-02', fecha_fin: '2026-07-15', estado: 'Finalizado',
    descripcion: 'Remoción de nitrógeno y fósforo de purines antes de su uso en fertirriego.' },
  { codigo: 'PRY-005', nombre: 'Efluentes de laboratorios universitarios',
    cliente_id: clienteIds[3], ubicacion: 'Campus Central, vía Chone',
    latitud: -0.2361, longitud: -79.1994, tipo_agua: 'Doméstica', caudal_m3_dia: 15,
    fecha_inicio: '2026-03-18', fecha_fin: '2026-06-30', estado: 'Finalizado',
    descripcion: 'Proyecto de investigación conjunta sobre viabilidad bacteriana en biocápsulas.' },
  { codigo: 'PRY-006', nombre: 'Efluentes de extractora de aceite de palma',
    cliente_id: clienteIds[4], ubicacion: 'Km 38 vía Esmeraldas, La Concordia',
    latitud: -0.0086, longitud: -79.3814, tipo_agua: 'Industrial', caudal_m3_dia: 320,
    fecha_inicio: '2026-08-15', fecha_fin: null, estado: 'Planificado',
    descripcion: 'Etapa de diseño; caracterización inicial programada para agosto de 2026.' },
];

const proyectoIds = proyectos.map((p) => Number(run(
  `INSERT INTO proyectos (codigo, nombre, cliente_id, ubicacion, latitud, longitud, tipo_agua,
          caudal_m3_dia, fecha_inicio, fecha_fin, estado, descripcion)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  p.codigo, p.nombre, p.cliente_id, p.ubicacion, p.latitud, p.longitud, p.tipo_agua,
  p.caudal_m3_dia, p.fecha_inicio, p.fecha_fin, p.estado, p.descripcion,
).lastInsertRowid));

/* --------------------------- Puntos de muestreo (Módulo 6) --------------------------- */

const puntos = [
  { p: 0, codigo: 'PM-01', nombre: 'Afluente crudo — canal de entrada', tipo: 'Entrada',
    latitud: -0.25412, longitud: -79.17538, descripcion: 'Canal de llegada posterior al desbaste y desarenador.' },
  { p: 0, codigo: 'PM-02', nombre: 'Reactor de biocápsulas', tipo: 'Intermedio',
    latitud: -0.25438, longitud: -79.17501, descripcion: 'Lecho empacado con biocápsulas de alginato, aireación difusa.' },
  { p: 0, codigo: 'PM-03', nombre: 'Efluente tratado — vertedero de salida', tipo: 'Salida',
    latitud: -0.25461, longitud: -79.17474, descripcion: 'Vertedero triangular a la salida del sedimentador secundario.' },
  { p: 0, codigo: 'PM-04', nombre: 'Estero Chigüilpe — 50 m aguas abajo', tipo: 'Cuerpo receptor',
    latitud: -0.25502, longitud: -79.17399, descripcion: 'Punto de control ambiental en el cuerpo receptor.' },

  { p: 1, codigo: 'PM-01', nombre: 'Trampa de grasas — entrada', tipo: 'Entrada',
    latitud: -0.28331, longitud: -79.24118, descripcion: 'Salida de la trampa de grasas del área de lavado.' },
  { p: 1, codigo: 'PM-02', nombre: 'Efluente tratado', tipo: 'Salida',
    latitud: -0.28352, longitud: -79.24089, descripcion: 'Descarga final al alcantarillado industrial.' },

  { p: 2, codigo: 'PM-01', nombre: 'Laguna de lixiviados', tipo: 'Entrada',
    latitud: -0.21961, longitud: -79.25881, descripcion: 'Laguna de acumulación de lixiviados crudos.' },
  { p: 2, codigo: 'PM-02', nombre: 'Salida del reactor BC-M4', tipo: 'Salida',
    latitud: -0.21984, longitud: -79.25842, descripcion: 'Efluente tras 72 h de retención en el reactor.' },

  { p: 3, codigo: 'PM-01', nombre: 'Canal de purines', tipo: 'Entrada',
    latitud: -0.14831, longitud: -79.35972, descripcion: 'Canal de recolección del establo principal.' },
  { p: 3, codigo: 'PM-02', nombre: 'Tanque de fertirriego', tipo: 'Salida',
    latitud: -0.14858, longitud: -79.35941, descripcion: 'Tanque de almacenamiento previo al fertirriego.' },

  { p: 4, codigo: 'PM-01', nombre: 'Sumidero de laboratorios', tipo: 'Entrada',
    latitud: -0.23612, longitud: -79.19943, descripcion: 'Colector de los laboratorios de química y biología.' },
  { p: 4, codigo: 'PM-02', nombre: 'Salida del prototipo', tipo: 'Salida',
    latitud: -0.23634, longitud: -79.19918, descripcion: 'Salida del reactor prototipo de 200 L.' },
];

const puntoIds = {};
for (const pt of puntos) {
  const id = Number(run(
    `INSERT INTO puntos_muestreo (proyecto_id, codigo, nombre, tipo, latitud, longitud, descripcion)
     VALUES (?,?,?,?,?,?,?)`,
    proyectoIds[pt.p], pt.codigo, pt.nombre, pt.tipo, pt.latitud, pt.longitud, pt.descripcion,
  ).lastInsertRowid);
  puntoIds[`${pt.p}:${pt.codigo}`] = id;
}

/* ---------------------- Resultados de análisis (Módulos 7, 8) ---------------------- */

const parametros = all('SELECT * FROM parametros ORDER BY orden');
const paramPorCodigo = Object.fromEntries(parametros.map((p) => [p.codigo, p]));

const insMuestreo = db.prepare(
  `INSERT INTO muestreos (codigo, proyecto_id, punto_id, etapa, fecha_muestreo, hora, responsable,
          laboratorio, biocapsula_id, dosis_capsulas, tiempo_retencion_h, observaciones, created_by)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);
const insResultado = db.prepare(
  'INSERT INTO resultados (muestreo_id, parametro_id, valor, valor_texto, metodo) VALUES (?,?,?,?,?)',
);

const METODOS = {
  temperatura: 'APHA 2550 B', ph: 'APHA 4500-H⁺ B', oxigeno_disuelto: 'APHA 4500-O G',
  conductividad: 'APHA 2510 B', turbidez: 'APHA 2130 B', sst: 'APHA 2540 D', sdt: 'APHA 2540 C',
  dbo5: 'APHA 5210 B', dqo: 'APHA 5220 D', nh4_n: 'APHA 4500-NH₃ F',
  fosforo_total: 'APHA 4500-P E', coliformes_totales: 'APHA 9221 B', olor: 'Organoléptico',
};

let contadorMuestreo = {};

function registrarMuestreo({ proyectoIdx, punto, etapa, fecha, hora, responsable, lote, dosis, retencion, obs, valores }) {
  const clave = proyectoIdx;
  contadorMuestreo[clave] = (contadorMuestreo[clave] || 0) + 1;
  const codigo = `Muestra ${String(contadorMuestreo[clave]).padStart(3, '0')}`;

  const muestreoId = Number(insMuestreo.run(
    codigo, proyectoIds[proyectoIdx], puntoIds[`${proyectoIdx}:${punto}`] ?? null, etapa, fecha,
    hora ?? null, responsable ?? 'Blga. Karla Intriago', 'Laboratorio BioCaps · Santo Domingo',
    lote ?? null, dosis ?? null, retencion ?? null, obs ?? null,
    etapa === 'antes' ? analistaId : analistaId,
  ).lastInsertRowid);

  for (const [cod, valor] of Object.entries(valores)) {
    const p = paramPorCodigo[cod];
    if (!p || valor === null || valor === undefined) continue;
    if (p.tipo === 'cualitativo') insResultado.run(muestreoId, p.id, null, String(valor), METODOS[cod] ?? null);
    else insResultado.run(muestreoId, p.id, Number(valor), null, METODOS[cod] ?? null);
  }
  return { id: muestreoId, codigo };
}

/* --- Proyecto 1: PTAR Municipal, seis campañas mensuales (febrero–julio 2026) --- */

// Afluente crudo típico de agua residual doméstica (base del ejemplo del protocolo).
const AFLUENTE = {
  temperatura: 24.8, ph: 7.1, oxigeno_disuelto: 0.8, conductividad: 1180, turbidez: 165,
  sst: 320, sdt: 890, dbo5: 285, dqo: 610, nh4_n: 120, fosforo_total: 12.5,
  coliformes_totales: 2400000, olor: 'Séptico intenso',
};

// Efluente objetivo alcanzado en la última campaña (NH₄⁺-N 18 mg/L → 85 % de remoción).
const EFLUENTE_OBJETIVO = {
  temperatura: 24.1, ph: 7.4, oxigeno_disuelto: 5.6, conductividad: 640, turbidez: 8.5,
  sst: 42, sdt: 520, dbo5: 38, dqo: 92, nh4_n: 18, fosforo_total: 3.9,
  coliformes_totales: 780, olor: 'Inodoro',
};

// Maduración del biofilm encapsulado: factor sobre el efluente objetivo (1.0 = desempeño final).
const CAMPANAS = [
  { mes: '2026-02', dia: '12', factor: 2.90, od: 1.9, ph: 6.6, olor: 'Ligeramente séptico', lote: 0, dosis: 12000, ret: 18,
    obs: 'Primera campaña. Arranque del reactor; biofilm en formación sobre las biocápsulas.' },
  { mes: '2026-03', dia: '11', factor: 2.20, od: 2.6, ph: 6.8, olor: 'Ligeramente séptico', lote: 0, dosis: 12000, ret: 20,
    obs: 'Colonización progresiva de la matriz de alginato.' },
  { mes: '2026-04', dia: '15', factor: 1.70, od: 3.4, ph: 7.0, olor: 'Terroso', lote: 2, dosis: 15000, ret: 22,
    obs: 'Recambio de lote (BC-2026-003) e incremento de dosis.' },
  { mes: '2026-05', dia: '13', factor: 1.35, od: 4.3, ph: 7.2, olor: 'Inodoro', lote: 2, dosis: 15000, ret: 24,
    obs: 'Régimen estable. Se ajustó el tiempo de retención hidráulica a 24 h.' },
  { mes: '2026-06', dia: '10', factor: 1.12, od: 5.1, ph: 7.3, olor: 'Inodoro', lote: 2, dosis: 16000, ret: 24,
    obs: 'Nitrificación consolidada; NH₄⁺-N por debajo de 25 mg/L.' },
  { mes: '2026-07', dia: '14', factor: 1.00, od: 5.6, ph: 7.4, olor: 'Inodoro', lote: 5, dosis: 16500, ret: 24,
    obs: 'Campaña de referencia con el lote vigente BC-2026-006. Desempeño de diseño alcanzado.' },
];

// Variación natural del afluente entre campañas (determinista, para reproducibilidad).
const VARIACION = [1.05, 0.97, 1.12, 1.02, 0.94, 1.00];

const REDUCIBLES = ['conductividad', 'turbidez', 'sst', 'sdt', 'dbo5', 'dqo', 'nh4_n', 'fosforo_total', 'coliformes_totales'];

const redondear = (cod, v) => {
  if (cod === 'coliformes_totales') return Math.round(v / 10) * 10;
  if (['conductividad', 'sdt'].includes(cod)) return Math.round(v);
  if (['sst', 'dbo5', 'dqo'].includes(cod)) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
};

const paresPTAR = [];

CAMPANAS.forEach((c, i) => {
  const fecha = `${c.mes}-${c.dia}`;
  const varia = VARIACION[i];

  const valoresAntes = { ...AFLUENTE };
  for (const cod of REDUCIBLES) valoresAntes[cod] = redondear(cod, AFLUENTE[cod] * varia);
  valoresAntes.temperatura = redondear('temperatura', AFLUENTE.temperatura + (i % 3) * 0.4 - 0.4);
  valoresAntes.oxigeno_disuelto = redondear('oxigeno_disuelto', AFLUENTE.oxigeno_disuelto + (i % 2) * 0.2);
  valoresAntes.ph = redondear('ph', AFLUENTE.ph + (i % 3) * 0.1 - 0.1);

  const valoresDespues = {};
  for (const cod of REDUCIBLES) {
    // El último mes reproduce exactamente el ejemplo del protocolo (120 → 18 mg/L).
    valoresDespues[cod] = i === CAMPANAS.length - 1
      ? EFLUENTE_OBJETIVO[cod]
      : redondear(cod, EFLUENTE_OBJETIVO[cod] * c.factor * (0.5 + varia / 2));
  }
  valoresDespues.temperatura = redondear('temperatura', EFLUENTE_OBJETIVO.temperatura + (i % 3) * 0.3 - 0.3);
  valoresDespues.oxigeno_disuelto = c.od;
  valoresDespues.ph = c.ph;
  valoresDespues.olor = c.olor;

  const antes = registrarMuestreo({
    proyectoIdx: 0, punto: 'PM-01', etapa: 'antes', fecha, hora: '08:30',
    responsable: 'Ing. Fausto Paredes', obs: `Afluente crudo, campaña ${c.mes}.`, valores: valoresAntes,
  });
  const despues = registrarMuestreo({
    proyectoIdx: 0, punto: 'PM-03', etapa: 'despues', fecha, hora: '15:45',
    responsable: 'Blga. Karla Intriago', lote: loteIds[c.lote], dosis: c.dosis, retencion: c.ret,
    obs: c.obs, valores: valoresDespues,
  });
  paresPTAR.push({ antes, despues, fecha, mes: c.mes });
});

/* --- Proyecto 2: efluente lácteo (dos campañas) --- */

const lacteoAntes = {
  temperatura: 31.5, ph: 5.4, oxigeno_disuelto: 0.4, conductividad: 2150, turbidez: 480,
  sst: 780, sdt: 1450, dbo5: 1850, dqo: 3200, nh4_n: 68, fosforo_total: 34,
  coliformes_totales: 180000, olor: 'Ácido láctico intenso',
};
const lacteoDespues = [
  { temperatura: 29.8, ph: 6.9, oxigeno_disuelto: 3.1, conductividad: 1320, turbidez: 62,
    sst: 148, sdt: 980, dbo5: 210, dqo: 420, nh4_n: 22, fosforo_total: 12.4,
    coliformes_totales: 4200, olor: 'Ligeramente ácido' },
  { temperatura: 29.2, ph: 7.2, oxigeno_disuelto: 4.4, conductividad: 1080, turbidez: 24,
    sst: 88, sdt: 820, dbo5: 96, dqo: 195, nh4_n: 14.5, fosforo_total: 8.2,
    coliformes_totales: 1400, olor: 'Inodoro' },
];

[['2026-04-09', 0], ['2026-06-18', 1]].forEach(([fecha, idx]) => {
  registrarMuestreo({
    proyectoIdx: 1, punto: 'PM-01', etapa: 'antes', fecha, hora: '09:15',
    responsable: 'Ing. Fausto Paredes', obs: 'Efluente de lavado de tanques y pasteurizadores.',
    valores: idx === 0 ? lacteoAntes : { ...lacteoAntes, dbo5: 1720, dqo: 3010, sst: 720 },
  });
  registrarMuestreo({
    proyectoIdx: 1, punto: 'PM-02', etapa: 'despues', fecha, hora: '16:20',
    responsable: 'Blga. Karla Intriago', lote: loteIds[1], dosis: 12000, ret: 36,
    obs: idx === 0 ? 'Primera evaluación con consorcio BC-O2.' : 'Segunda evaluación; se duplicó la aireación.',
    valores: lacteoDespues[idx],
  });
});

/* --- Proyecto 3: lixiviados (una campaña) --- */

registrarMuestreo({
  proyectoIdx: 2, punto: 'PM-01', etapa: 'antes', fecha: '2026-05-20', hora: '10:00',
  responsable: 'Ing. Fausto Paredes', obs: 'Lixiviado crudo de la laguna de acumulación.',
  valores: {
    temperatura: 27.4, ph: 8.3, oxigeno_disuelto: 0.2, conductividad: 14800, turbidez: 920,
    sst: 1240, sdt: 9800, dbo5: 2400, dqo: 9600, nh4_n: 1450, fosforo_total: 48,
    coliformes_totales: 950000, olor: 'Pútrido característico de lixiviado',
  },
});
registrarMuestreo({
  proyectoIdx: 2, punto: 'PM-02', etapa: 'despues', fecha: '2026-06-24', hora: '11:30',
  responsable: 'Blga. Karla Intriago', lote: loteIds[3], dosis: 9000, ret: 72,
  obs: 'Tratamiento con consorcio mixto BC-M4 y 72 h de retención. Requiere etapa complementaria.',
  valores: {
    temperatura: 26.8, ph: 7.8, oxigeno_disuelto: 2.4, conductividad: 6200, turbidez: 180,
    sst: 310, sdt: 4100, dbo5: 380, dqo: 1450, nh4_n: 320, fosforo_total: 16.8,
    coliformes_totales: 8600, olor: 'Terroso',
  },
});

/* --- Proyecto 4: purines de establo (dos campañas, proyecto finalizado) --- */

[['2026-04-16', { dbo5: 1420, dqo: 2850, nh4_n: 340, fosforo_total: 62, sst: 940 }],
  ['2026-07-08', { dbo5: 1360, dqo: 2720, nh4_n: 318, fosforo_total: 58, sst: 890 }]].forEach(([fecha, ajuste], idx) => {
  registrarMuestreo({
    proyectoIdx: 3, punto: 'PM-01', etapa: 'antes', fecha, hora: '07:45',
    responsable: 'Ing. Fausto Paredes', obs: 'Purines del establo principal antes del tratamiento.',
    valores: {
      temperatura: 25.9, ph: 6.9, oxigeno_disuelto: 0.3, conductividad: 3600, turbidez: 610,
      sdt: 2400, coliformes_totales: 4800000, olor: 'Amoniacal fuerte', ...ajuste,
    },
  });
  registrarMuestreo({
    proyectoIdx: 3, punto: 'PM-02', etapa: 'despues', fecha, hora: '17:10',
    responsable: 'Blga. Karla Intriago', lote: loteIds[4], dosis: 14000, ret: 48,
    obs: idx === 0 ? 'Primer ciclo con consorcio BC-P3.' : 'Cierre del proyecto: agua apta para fertirriego.',
    valores: idx === 0
      ? { temperatura: 25.2, ph: 7.3, oxigeno_disuelto: 3.6, conductividad: 1850, turbidez: 74,
        sst: 168, sdt: 1320, dbo5: 220, dqo: 460, nh4_n: 52, fosforo_total: 14.2,
        coliformes_totales: 12000, olor: 'Terroso' }
      : { temperatura: 24.8, ph: 7.5, oxigeno_disuelto: 5.1, conductividad: 1420, turbidez: 18,
        sst: 96, sdt: 1050, dbo5: 92, dqo: 186, nh4_n: 26, fosforo_total: 9.1,
        coliformes_totales: 1800, olor: 'Inodoro' },
  });
});

/* --- Proyecto 5: efluentes universitarios (una campaña, finalizado) --- */

registrarMuestreo({
  proyectoIdx: 4, punto: 'PM-01', etapa: 'antes', fecha: '2026-04-22', hora: '09:00',
  responsable: 'Dra. Elena Mosquera', obs: 'Muestra compuesta de los laboratorios de química y biología.',
  valores: {
    temperatura: 23.6, ph: 6.4, oxigeno_disuelto: 1.6, conductividad: 1420, turbidez: 96,
    sst: 210, sdt: 780, dbo5: 168, dqo: 390, nh4_n: 46, fosforo_total: 8.4,
    coliformes_totales: 340000, olor: 'Químico leve',
  },
});
registrarMuestreo({
  proyectoIdx: 4, punto: 'PM-02', etapa: 'despues', fecha: '2026-06-26', hora: '15:00',
  responsable: 'Dra. Elena Mosquera', lote: loteIds[0], dosis: 4000, ret: 24,
  obs: 'Cierre del convenio de investigación. Viabilidad bacteriana del 92 % a los 60 días.',
  valores: {
    temperatura: 23.2, ph: 7.2, oxigeno_disuelto: 5.9, conductividad: 720, turbidez: 6.2,
    sst: 28, sdt: 460, dbo5: 24, dqo: 62, nh4_n: 8.4, fosforo_total: 2.8,
    coliformes_totales: 420, olor: 'Inodoro',
  },
});

/* ------------------------------- Reportes emitidos ------------------------------- */

const { analizarProyecto } = require('./routes/analisis');

function emitirReporte(proyectoIdx, antesId, despuesId, firma) {
  const proyectoId = proyectoIds[proyectoIdx];
  const analisis = analizarProyecto(proyectoId, antesId, despuesId);
  if (!analisis?.antes || !analisis?.despues) return null;

  const anio = 2026;
  const n = get(`SELECT COUNT(*) AS n FROM reportes WHERE codigo LIKE 'BC-${anio}-%'`).n + 1;
  const codigo = `BC-${anio}-${String(n).padStart(4, '0')}`;

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
        reduccion: p.reduccion, cumple: p.cumple_despues, nivel: p.nivel_despues.clave,
      })),
  };

  run(
    `INSERT INTO reportes (codigo, proyecto_id, muestreo_antes_id, muestreo_despues_id, titulo,
            resumen_json, firma_nombre, firma_cargo, token, generado_por)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    codigo, proyectoId, antesId, despuesId,
    `Informe técnico de eficiencia de tratamiento — ${analisis.proyecto.nombre}`,
    JSON.stringify(resumen), firma.nombre, firma.cargo,
    crypto.randomBytes(16).toString('hex'), firma.usuarioId,
  );
  return codigo;
}

const firmaAdmin = { nombre: 'Ing. David Andrés Cevallos', cargo: 'Responsable técnico BioCaps', usuarioId: adminId };
const firmaAnalista = { nombre: 'Blga. Karla Intriago', cargo: 'Analista de laboratorio', usuarioId: analistaId };

const reportesEmitidos = [
  emitirReporte(0, paresPTAR[3].antes.id, paresPTAR[3].despues.id, firmaAnalista),
  emitirReporte(0, paresPTAR[5].antes.id, paresPTAR[5].despues.id, firmaAdmin),
  emitirReporte(4, null, null, firmaAdmin),
].filter(Boolean);

/* ------------------------------- Noticias (Módulo 1) ------------------------------- */

const noticias = [
  { titulo: 'BioCaps alcanza 85 % de remoción de nitrógeno amoniacal en la PTAR municipal',
    resumen: 'La campaña de julio de 2026 confirmó una reducción de NH₄⁺-N de 120 a 18 mg/L en el módulo biológico con biocápsulas.',
    cuerpo: 'Tras seis campañas mensuales de monitoreo, el reactor de lecho de biocápsulas instalado en la PTAR Bombolí '
      + 'alcanzó el desempeño de diseño: 85 % de remoción de nitrógeno amoniacal, 86 % de DBO₅ y 85 % de DQO, con un '
      + 'efluente que cumple los límites de descarga a cuerpo de agua dulce.',
    etiqueta: 'Resultados', fecha: '2026-07-18' },
  { titulo: 'Nuevo lote BC-2026-006 con mayor concentración bacteriana',
    resumen: 'El lote vigente eleva la concentración a 1,6 × 10⁹ UFC/mL manteniendo un diámetro de cápsula de 3,4 mm.',
    cuerpo: 'La optimización del protocolo de encapsulación en alginato de sodio al 2 % reticulado con CaCl₂ permitió '
      + 'incrementar la carga bacteriana sin comprometer la resistencia mecánica de las esferas.',
    etiqueta: 'Producción', fecha: '2026-07-06' },
  { titulo: 'Convenio de investigación con la Universidad Politécnica del Trópico',
    resumen: 'Se cerró el proyecto conjunto de caracterización de viabilidad bacteriana con 92 % de supervivencia a los 60 días.',
    cuerpo: 'El estudio evaluó la viabilidad de los consorcios encapsulados en condiciones de operación real, '
      + 'aportando evidencia para el escalamiento industrial de las biocápsulas.',
    etiqueta: 'Investigación', fecha: '2026-06-30' },
  { titulo: 'Biorremediación de lixiviados: primeros resultados en el relleno sanitario',
    resumen: 'El consorcio mixto BC-M4 redujo la DQO de 9 600 a 1 450 mg/L en 72 horas de retención.',
    cuerpo: 'Aunque el efluente todavía requiere una etapa complementaria de pulido, la remoción del 85 % de DQO en '
      + 'una matriz tan compleja como el lixiviado valida el uso de consorcios encapsulados en este tipo de efluentes.',
    etiqueta: 'Proyectos', fecha: '2026-06-25' },
  { titulo: 'BioCaps Monitor® incorpora verificación de reportes mediante código QR',
    resumen: 'Cada informe técnico emitido incluye un QR que permite validar públicamente su autenticidad.',
    cuerpo: 'La trazabilidad completa —desde el muestreo hasta el reporte firmado— queda disponible para auditorías '
      + 'ambientales y para los propios clientes.',
    etiqueta: 'Plataforma', fecha: '2026-06-12' },
];

for (const n of noticias) {
  run('INSERT INTO noticias (titulo, resumen, cuerpo, etiqueta, fecha) VALUES (?,?,?,?,?)',
    n.titulo, n.resumen, n.cuerpo, n.etiqueta, n.fecha);
}

/* ------------------------------- Historial inicial ------------------------------- */

run(
  `INSERT INTO historial (usuario_id, usuario, accion, entidad, detalle)
   VALUES (?,?,?,?,?)`,
  adminId, 'Ing. David Andrés Cevallos', 'Cargó el proyecto de demostración', 'sistema',
  'PTAR Municipal Santo Domingo con 6 campañas de monitoreo',
);

/* ------------------------------- Resumen en consola ------------------------------- */

const ultimo = analizarProyecto(proyectoIds[0]);
const fmt = (n, d = 1) => (n === null || n === undefined ? 'n/d' : Number(n).toFixed(d));

console.log('');
console.log('  ✓ Proyecto de demostración cargado');
console.log('  ────────────────────────────────────────────────────────');
console.log(`    Clientes              ${clienteIds.length}`);
console.log(`    Proyectos             ${proyectoIds.length}`);
console.log(`    Puntos de muestreo    ${get('SELECT COUNT(*) AS n FROM puntos_muestreo').n}`);
console.log(`    Muestreos             ${get('SELECT COUNT(*) AS n FROM muestreos').n}`);
console.log(`    Resultados            ${get('SELECT COUNT(*) AS n FROM resultados').n}`);
console.log(`    Lotes de biocápsulas  ${loteIds.length}`);
console.log(`    Reportes emitidos     ${reportesEmitidos.join(', ')}`);
console.log('  ────────────────────────────────────────────────────────');
console.log('    PTAR Municipal Santo Domingo — última campaña:');
const nh4 = ultimo.parametros.find((p) => p.codigo === 'nh4_n');
const dbo = ultimo.parametros.find((p) => p.codigo === 'dbo5');
const dqo = ultimo.parametros.find((p) => p.codigo === 'dqo');
console.log(`      NH₄⁺-N   ${nh4.valor_antes} → ${nh4.valor_despues} mg/L   (${fmt(nh4.reduccion)} % de remoción)`);
console.log(`      DBO₅     ${dbo.valor_antes} → ${dbo.valor_despues} mg/L   (${fmt(dbo.reduccion)} % de remoción)`);
console.log(`      DQO      ${dqo.valor_antes} → ${dqo.valor_despues} mg/L   (${fmt(dqo.reduccion)} % de remoción)`);
console.log(`      Remoción promedio  ${fmt(ultimo.resumen.reduccion_promedio)} %`);
console.log(`      Cumplimiento       ${fmt(ultimo.resumen.cumplimiento_pct, 0)} %`);
console.log(`      Calidad del agua   ${ultimo.resumen.calidad_antes.etiqueta} → ${ultimo.resumen.calidad_despues.etiqueta}`);
console.log('  ────────────────────────────────────────────────────────');
console.log('    Usuarios (contraseña: biocaps2026)');
console.log('      admin@biocaps.ec         · administrador');
console.log('      analista@biocaps.ec      · analista');
console.log('      cliente@emapasd.gob.ec   · cliente');
console.log('');
console.log('    Ejecute  npm start  y abra http://localhost:3000');
console.log('');
