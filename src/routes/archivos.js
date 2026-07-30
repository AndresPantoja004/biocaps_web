/** Fotografías y archivos adjuntos (Módulo 6: fotografía del punto de muestreo) */
const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const multer = require('multer');
const { all, get, run, registrarHistorial } = require('../db');
const { requiereSesion, requiereEdicion } = require('../lib/auth');
const config = require('../config');

const router = express.Router();

const UPLOADS = config.rutaSubidas;
fs.mkdirSync(UPLOADS, { recursive: true });

const EXT_IMAGEN = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const subir = multer({
  storage,
  limits: { fileSize: config.tamanoMaximoArchivoMB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_IMAGEN.has(ext) && !['.pdf', '.csv', '.xlsx', '.docx'].includes(ext)) {
      return cb(new Error('Formato no permitido. Use imágenes, PDF, CSV, XLSX o DOCX.'));
    }
    cb(null, true);
  },
});

const ENTIDADES = new Set(['puntos_muestreo', 'muestreos', 'proyectos', 'clientes', 'biocapsulas']);

router.post('/', requiereEdicion, subir.single('archivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  const { entidad, entidad_id, descripcion } = req.body || {};
  if (!ENTIDADES.has(entidad) || !entidad_id) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Indique una entidad válida y su identificador.' });
  }

  const ext = path.extname(req.file.filename).toLowerCase();
  const esImagen = EXT_IMAGEN.has(ext);
  const ruta = `/uploads/${req.file.filename}`;
  const tabla = esImagen ? 'fotografias' : 'archivos';

  const r = esImagen
    ? run(
      `INSERT INTO fotografias (entidad, entidad_id, ruta, nombre, descripcion, mime, tamano, subido_por)
       VALUES (?,?,?,?,?,?,?,?)`,
      entidad, Number(entidad_id), ruta, req.file.originalname, descripcion ?? null,
      req.file.mimetype, req.file.size, req.usuario.id,
    )
    : run(
      `INSERT INTO archivos (entidad, entidad_id, ruta, nombre, mime, tamano, subido_por)
       VALUES (?,?,?,?,?,?,?)`,
      entidad, Number(entidad_id), ruta, req.file.originalname,
      req.file.mimetype, req.file.size, req.usuario.id,
    );

  const id = Number(r.lastInsertRowid);

  // La fotografía principal del punto de muestreo se enlaza automáticamente.
  if (esImagen && entidad === 'puntos_muestreo') {
    const punto = get('SELECT fotografia_id FROM puntos_muestreo WHERE id = ?', Number(entidad_id));
    if (punto && !punto.fotografia_id) {
      run('UPDATE puntos_muestreo SET fotografia_id = ? WHERE id = ?', id, Number(entidad_id));
    }
  }

  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre,
    accion: esImagen ? 'Subió fotografía' : 'Subió archivo',
    entidad, entidad_id: Number(entidad_id), detalle: req.file.originalname,
  });

  res.status(201).json(get(`SELECT * FROM ${tabla} WHERE id = ?`, id));
});

router.get('/', requiereSesion, (req, res) => {
  const { entidad, entidad_id } = req.query;
  if (!ENTIDADES.has(entidad) || !entidad_id) {
    return res.status(400).json({ error: 'Indique entidad y entidad_id.' });
  }
  res.json({
    fotografias: all(
      'SELECT * FROM fotografias WHERE entidad = ? AND entidad_id = ? ORDER BY id DESC',
      entidad, Number(entidad_id),
    ),
    archivos: all(
      'SELECT * FROM archivos WHERE entidad = ? AND entidad_id = ? ORDER BY id DESC',
      entidad, Number(entidad_id),
    ),
  });
});

router.delete('/fotografias/:id', requiereEdicion, (req, res) => {
  const id = Number(req.params.id);
  const foto = get('SELECT * FROM fotografias WHERE id = ?', id);
  if (!foto) return res.status(404).json({ error: 'Fotografía no encontrada.' });
  run('UPDATE puntos_muestreo SET fotografia_id = NULL WHERE fotografia_id = ?', id);
  run('DELETE FROM fotografias WHERE id = ?', id);
  const archivo = path.join(UPLOADS, path.basename(foto.ruta));
  if (archivo.startsWith(UPLOADS) && fs.existsSync(archivo)) fs.unlinkSync(archivo);
  registrarHistorial({
    usuario_id: req.usuario.id, usuario: req.usuario.nombre, accion: 'Eliminó fotografía',
    entidad: foto.entidad, entidad_id: foto.entidad_id, detalle: foto.nombre,
  });
  res.json({ ok: true });
});

/** Errores de multer devueltos como JSON legible. */
router.use((err, _req, res, _next) => {
  if (err) return res.status(400).json({ error: err.message || 'No se pudo subir el archivo.' });
  res.status(500).json({ error: 'Error inesperado.' });
});

module.exports = router;
