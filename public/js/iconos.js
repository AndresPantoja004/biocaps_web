/* ============================================================================
   BioCaps Monitor® — Iconografía

   Iconos SVG de trazo, dibujados sobre una retícula de 24 × 24 y heredando el
   color del texto (`currentColor`). Sustituyen a los emoji para que la interfaz
   se vea homogénea en cualquier sistema operativo y para poder controlar grosor,
   tamaño y color desde el CSS.
   ========================================================================= */

window.BC = window.BC || {};

BC.iconos = {
  /* ------------------------------ Navegación ------------------------------ */
  panel: '<rect x="3" y="3" width="7.5" height="8.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5"/><rect x="3" y="15" width="7.5" height="6" rx="1.5"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5"/>',
  planta: '<path d="M3 21h18"/><path d="M4 21V9.5l5 3.2V9.5l5 3.2V6l6 3.4V21"/><path d="M8 17h1.5M13 17h1.5M18 17h1"/>',
  matraz: '<path d="M9.5 3h5"/><path d="M10.5 3v5.6L5.6 17a2.2 2.2 0 0 0 1.9 3.4h9a2.2 2.2 0 0 0 1.9-3.4l-4.9-8.4V3"/><path d="M7.6 14.2h8.8"/>',
  edificio: '<rect x="4" y="3" width="11" height="18" rx="1.5"/><path d="M15 9h4a1.5 1.5 0 0 1 1.5 1.5V21"/><path d="M7.5 7h1M11 7h1M7.5 11h1M11 11h1M7.5 15h1M11 15h1M17.5 13h.5M17.5 17h.5"/><path d="M3 21h18"/>',
  capsula: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 8c3 2 3 6 0 8M14.5 8c-3 2-3 6 0 8"/><path d="M10.2 10.2h3.6M10.6 13.8h2.8"/>',
  microbio: '<circle cx="12" cy="12" r="5.5"/><path d="M12 6.5V3M12 21v-3.5M17.5 12H21M3 12h3.5M15.9 8.1l2.3-2.3M5.8 18.2l2.3-2.3M15.9 15.9l2.3 2.3M5.8 5.8l2.3 2.3"/><circle cx="10.4" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="13.6" cy="13.4" r="1.1" fill="currentColor" stroke="none"/>',
  documento: '<path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
  ajustes: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2.1"/><circle cx="15" cy="12" r="2.1"/><circle cx="8" cy="18" r="2.1"/>',
  equipo: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.4a3.2 3.2 0 0 1 0 5.2M17.5 20a5.5 5.5 0 0 0-2.4-4.5"/>',
  usuario: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  escudo: '<path d="M12 3l7 3v5.5c0 4.3-2.9 8-7 9.5-4.1-1.5-7-5.2-7-9.5V6z"/><path d="M9.2 12l2 2 3.6-3.8"/>',
  microscopio: '<path d="M6 21h13"/><path d="M9 21a6 6 0 0 0 4.2-10.3"/><path d="M9.5 12.5l-2-2 5-5 2 2z"/><path d="M13 6l1.6-1.6a1.6 1.6 0 0 1 2.3 0l1.7 1.7a1.6 1.6 0 0 1 0 2.3L17 10"/><path d="M6.5 17.5h4"/>',

  /* -------------------------------- Acciones -------------------------------- */
  mas: '<path d="M12 5v14M5 12h14"/>',
  lapiz: '<path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="M14.5 6.5l3 3"/>',
  papelera: '<path d="M4 7h16"/><path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7"/><path d="M6.5 7l.8 12.1A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/><path d="M10.5 11v5.5M13.5 11v5.5"/>',
  buscar: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/>',
  refrescar: '<path d="M20 11a8 8 0 1 0-.6 4"/><path d="M20 5.5V11h-5.5"/>',
  descargar: '<path d="M12 3v11"/><path d="M8 10.5l4 4 4-4"/><path d="M4.5 17.5V19a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1.5"/>',
  enlace: '<path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  llave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8"/><path d="M16.5 6.5l2 2M14.5 8.5l2 2"/>',
  salir: '<path d="M15 5.5V4a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 4 4v16a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 15 20v-1.5"/><path d="M9.5 12H21"/><path d="M17.5 8.5L21 12l-3.5 3.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  filtro: '<path d="M3.5 5.5h17l-6.5 7.6V19l-4 2v-7.9z"/>',
  camara: '<path d="M4 8.5h3l1.5-2.5h7L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5z"/><circle cx="12" cy="14" r="3.5"/>',
  imagen: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="10" r="1.8"/><path d="M3.5 17l4.8-4.6 3.4 3.2 3.1-2.9L20.5 17"/>',
  candado: '<rect x="4.5" y="10" width="15" height="10.5" rx="2"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/><circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',

  /* -------------------------------- Estados -------------------------------- */
  check: '<path d="M5 12.5l4.8 4.8L19 7.5"/>',
  'check-circulo': '<circle cx="12" cy="12" r="8.5"/><path d="M8.4 12.2l2.6 2.6 4.6-5"/>',
  alerta: '<path d="M12 4.2L2.9 19.2a1.4 1.4 0 0 0 1.2 2.1h15.8a1.4 1.4 0 0 0 1.2-2.1z"/><path d="M12 10v4.4"/><circle cx="12" cy="17.6" r="1" fill="currentColor" stroke="none"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5"/><circle cx="12" cy="8.2" r="1" fill="currentColor" stroke="none"/>',
  rayo: '<path d="M13.5 2.5L5 13.5h6l-.5 8L19 10.5h-6z"/>',
  'reloj-arena': '<path d="M7 3h10M7 21h10"/><path d="M8 3v3.5c0 2 4 3.6 4 5.5s-4 3.5-4 5.5V21"/><path d="M16 3v3.5c0 2-4 3.6-4 5.5s4 3.5 4 5.5V21"/>',

  /* ------------------------------- Analítica ------------------------------- */
  'grafico-barras': '<path d="M4 20h16"/><rect x="5.5" y="11" width="3.6" height="6.5" rx="1"/><rect x="10.2" y="6.5" width="3.6" height="11" rx="1"/><rect x="14.9" y="9" width="3.6" height="8.5" rx="1"/>',
  'grafico-linea': '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M7 16l3.4-4.2 3 2.4L20 7.5"/><circle cx="7" cy="16" r="1.3" fill="currentColor" stroke="none"/><circle cx="20" cy="7.5" r="1.3" fill="currentColor" stroke="none"/>',
  'tendencia-baja': '<path d="M4 7.5l6 6 3.4-3.4L20 16.5"/><path d="M20 11.5v5h-5"/>',
  balanza: '<path d="M12 4v16M8 20h8"/><path d="M3 9l4.5-1.6L12 6l4.5 1.4L21 9"/><path d="M3 9l2.6 4.6a2.6 2.6 0 0 0 4.4 0L12.6 9"/><path d="M11.4 9l2.6 4.6a2.6 2.6 0 0 0 4.4 0L21 9"/>',
  medidor: '<path d="M4 17.5a8.5 8.5 0 1 1 16 0"/><path d="M12 17.5l3.6-5"/><circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none"/>',
  radar: '<path d="M12 2.8l8 5.8-3 9.4H7l-3-9.4z"/><path d="M12 7.4l4 2.9-1.5 4.7h-5L8 10.3z"/><path d="M12 2.8v18.6M4 8.6l16 5.8M20 8.6L4 14.4"/>',
  pastel: '<path d="M12 3.5v8.5h8.5A8.5 8.5 0 0 0 12 3.5z"/><path d="M20.2 15A8.5 8.5 0 1 1 10 3.6"/>',
  'mapa-pin': '<path d="M12 21.5s7-6.1 7-11.1a7 7 0 1 0-14 0c0 5 7 11.1 7 11.1z"/><circle cx="12" cy="10.2" r="2.6"/>',
  mapa: '<path d="M9 4.5L3.5 6.8v13L9 17.5l6 3 5.5-2.3v-13L15 7.5z"/><path d="M9 4.5v13M15 7.5v13"/>',
  qr: '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><path d="M13.5 13.5h3v3h-3z"/><path d="M19 13.5h1.5M13.5 19v1.5M17.5 20.5h3M20.5 16.5v2"/>',

  /* -------------------------------- Dominio -------------------------------- */
  gota: '<path d="M12 3.2c3.6 4.4 6 7.6 6 10.3a6 6 0 0 1-12 0c0-2.7 2.4-5.9 6-10.3z"/>',
  'gota-check': '<path d="M12 3.2c3.6 4.4 6 7.6 6 10.3a6 6 0 0 1-12 0c0-2.7 2.4-5.9 6-10.3z"/><path d="M9.5 13.6l1.8 1.8 3.4-3.6"/>',
  hoja: '<path d="M20 4c-8 0-14 3.4-14 10a6 6 0 0 0 1.6 4.1C10.6 20.6 20 17 20 4z"/><path d="M6 20c1.6-5.4 4.6-8.9 9-11"/>',
  casa: '<path d="M4 10.5L12 4l8 6.5"/><path d="M6 9.6V20h12V9.6"/><path d="M10 20v-5.5h4V20"/>',
  granja: '<path d="M3 21h18"/><path d="M4.5 21v-9L12 7l7.5 5v9"/><path d="M9.5 21v-5.5h5V21"/><path d="M12 3v4"/>',
  birrete: '<path d="M12 4L2.5 8.8 12 13.6l9.5-4.8z"/><path d="M6.5 11.2V16c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.8"/><path d="M21.5 8.8V15"/>',
  institucion: '<path d="M3 21h18"/><path d="M3 9.5L12 4l9 5.5"/><path d="M5.5 9.5V19M9.8 9.5V19M14.2 9.5V19M18.5 9.5V19"/><path d="M3.5 19h17"/>',
  residuos: '<path d="M4.5 7h15"/><path d="M9 7V5.4A1.4 1.4 0 0 1 10.4 4h3.2A1.4 1.4 0 0 1 15 5.4V7"/><path d="M6.5 7l.9 12A1.5 1.5 0 0 0 8.9 20.4h6.2A1.5 1.5 0 0 0 16.6 19l.9-12"/><path d="M12 10.5v6.5"/><path d="M9.6 13.2L12 10.5l2.4 2.7"/>',
  termometro: '<path d="M14 13.6V5.5a2.5 2.5 0 0 0-5 0v8.1a4.5 4.5 0 1 0 5 0z"/><path d="M11.5 8.5v7"/>',
  cronometro: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4"/><path d="M9.5 2.5h5M18.5 7.5l1.5-1.5"/>',
  objetivo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  /* Procesador: lee con claridad a 14–18 px, a diferencia de una silueta de cerebro. */
  cerebro: '<rect x="7" y="7" width="10" height="10" rx="2"/><rect x="10.2" y="10.2" width="3.6" height="3.6" rx="0.8"/><path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3"/>',
  caja: '<path d="M3.5 8.5L12 4l8.5 4.5v7L12 20l-8.5-4.5z"/><path d="M3.5 8.5L12 13l8.5-4.5M12 13v7"/>',
  semilla: '<path d="M12 21c-4-1.5-6.5-4.6-6.5-8.5S8 5.5 12 3c4 2.5 6.5 5.6 6.5 9.5S16 19.5 12 21z"/><path d="M12 21V7"/><path d="M12 12.5l3.2-2.6M12 16l-3-2.4"/>',
};

/**
 * Devuelve el marcado SVG de un icono.
 * @param {string} nombre  clave de BC.iconos
 * @param {object} opciones  { tam, clase, trazo, relleno }
 */
BC.icono = function icono(nombre, opciones = {}) {
  const cuerpo = BC.iconos[nombre];
  if (!cuerpo) return '';
  const { tam = 18, clase = '', trazo = 1.7 } = opciones;
  return `<svg class="icono ${clase}" width="${tam}" height="${tam}" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="${trazo}"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${cuerpo}</svg>`;
};

/** Iconos asociados a los catálogos del dominio. */
BC.iconoTipoCliente = (tipo) => ({
  Empresa: 'edificio', Municipio: 'institucion', Industria: 'planta',
  'Ganadería': 'granja', Universidad: 'birrete',
}[tipo] || 'edificio');

BC.iconoTipoAgua = (tipo) => ({
  'Doméstica': 'casa', Industrial: 'planta', 'Agrícola': 'hoja', Lixiviados: 'residuos',
}[tipo] || 'gota');

BC.iconoRol = (rol) => ({
  administrador: 'escudo', analista: 'microscopio', cliente: 'edificio',
}[rol] || 'usuario');

BC.iconoEntidad = (entidad) => ({
  usuarios: 'equipo', clientes: 'edificio', proyectos: 'planta',
  puntos_muestreo: 'mapa-pin', muestreos: 'matraz', reportes: 'documento',
  biocapsulas: 'capsula', consorcios_bacterianos: 'microbio',
  parametros: 'ajustes', sistema: 'caja', archivos: 'imagen',
}[entidad] || 'info');

BC.iconoAviso = (tipo) => ({
  exito: 'check-circulo', alerta: 'alerta', error: 'alerta', info: 'info',
}[tipo] || 'info');
