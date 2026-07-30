/**
 * Copia las librerías de navegador desde node_modules hacia public/vendor,
 * de modo que la plataforma funcione sin conexión a internet (demo offline).
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'vendor');

const ASSETS = [
  ['chart.js/dist/chart.umd.js', 'chart.umd.js'],
  ['leaflet/dist/leaflet.js', 'leaflet.js'],
  ['leaflet/dist/leaflet.css', 'leaflet.css'],
  ['jspdf/dist/jspdf.umd.min.js', 'jspdf.umd.min.js'],
  ['jspdf-autotable/dist/jspdf.plugin.autotable.min.js', 'jspdf.plugin.autotable.min.js'],
  ['html2canvas/dist/html2canvas.min.js', 'html2canvas.min.js'],
];

const DIRS = [['leaflet/dist/images', 'images']];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.mkdirSync(OUT, { recursive: true });

let copied = 0;
let missing = 0;

for (const [from, to] of ASSETS) {
  const src = path.join(ROOT, 'node_modules', from);
  if (!fs.existsSync(src)) {
    console.warn(`[vendor] falta ${from} (ejecute npm install)`);
    missing++;
    continue;
  }
  fs.copyFileSync(src, path.join(OUT, to));
  copied++;
}

for (const [from, to] of DIRS) {
  const src = path.join(ROOT, 'node_modules', from);
  if (!fs.existsSync(src)) {
    missing++;
    continue;
  }
  copyDir(src, path.join(OUT, to));
  copied++;
}

console.log(`[vendor] ${copied} recursos copiados a public/vendor${missing ? ` (${missing} faltantes)` : ''}`);
