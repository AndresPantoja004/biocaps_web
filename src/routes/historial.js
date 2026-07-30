/** Histórico — trazabilidad de todas las operaciones del sistema */
const express = require('express');
const { all, get } = require('../db');
const { requiereSesion } = require('../lib/auth');

const router = express.Router();

router.get('/', requiereSesion, (req, res) => {
  const limite = Math.min(Number(req.query.limite) || 100, 500);
  const filtros = [];
  const params = [];

  if (req.usuario.rol !== 'administrador') {
    // Analistas y clientes no ven la actividad de gestión de usuarios.
    filtros.push("entidad IS NOT 'usuarios'");
  }
  if (req.query.entidad) {
    filtros.push('entidad = ?');
    params.push(req.query.entidad);
  }
  if (req.query.q) {
    filtros.push('(accion LIKE ? OR detalle LIKE ? OR usuario LIKE ?)');
    const q = `%${req.query.q}%`;
    params.push(q, q, q);
  }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  res.json({
    total: get(`SELECT COUNT(*) AS n FROM historial ${where}`, ...params).n,
    registros: all(
      `SELECT * FROM historial ${where} ORDER BY id DESC LIMIT ?`, ...params, limite,
    ),
  });
});

/** Histórico de muestreos y resultados de un proyecto (línea de tiempo). */
router.get('/proyecto/:id', requiereSesion, (req, res) => {
  const proyectoId = Number(req.params.id);
  if (req.usuario.rol === 'cliente') {
    const p = get('SELECT cliente_id FROM proyectos WHERE id = ?', proyectoId);
    if (!p || p.cliente_id !== req.usuario.cliente_id) {
      return res.status(403).json({ error: 'No tiene acceso a este proyecto.' });
    }
  }
  res.json({
    muestreos: all(
      `SELECT m.id, m.codigo, m.etapa, m.fecha_muestreo, m.hora, m.responsable, m.laboratorio,
              pm.codigo AS punto_codigo, b.lote AS biocapsula_lote,
              (SELECT COUNT(*) FROM resultados r WHERE r.muestreo_id = m.id) AS parametros_registrados
       FROM muestreos m
       LEFT JOIN puntos_muestreo pm ON pm.id = m.punto_id
       LEFT JOIN biocapsulas b ON b.id = m.biocapsula_id
       WHERE m.proyecto_id = ? ORDER BY date(m.fecha_muestreo) DESC, m.id DESC`, proyectoId,
    ),
    reportes: all(
      `SELECT id, codigo, titulo, created_at, token FROM reportes
       WHERE proyecto_id = ? ORDER BY id DESC`, proyectoId,
    ),
    eventos: all(
      `SELECT * FROM historial
       WHERE (entidad = 'proyectos' AND entidad_id = ?)
          OR (entidad = 'muestreos' AND entidad_id IN (SELECT id FROM muestreos WHERE proyecto_id = ?))
          OR (entidad = 'reportes' AND entidad_id IN (SELECT id FROM reportes WHERE proyecto_id = ?))
          OR (entidad = 'puntos_muestreo' AND entidad_id IN (SELECT id FROM puntos_muestreo WHERE proyecto_id = ?))
       ORDER BY id DESC LIMIT 60`,
      proyectoId, proyectoId, proyectoId, proyectoId,
    ),
  });
});

module.exports = router;
