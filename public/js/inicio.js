/* BioCaps Monitor® — Página de inicio (Módulo 1) */

const esc = BC.esc;

const fecha = (f) => {
  if (!f) return '';
  const d = new Date(`${f}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? f
    : d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
};

document.getElementById('anio').textContent = new Date().getFullYear();

/* Iconos de los bloques estáticos marcados con data-icono */
for (const nodo of document.querySelectorAll('[data-icono]')) {
  nodo.insertAdjacentHTML('afterbegin', `${BC.icono(nodo.dataset.icono, { tam: 18, clase: 'icono-marca' })} `);
}
document.getElementById('hero-sello')
  ?.insertAdjacentHTML('afterbegin', BC.icono('capsula', { tam: 15 }));

/** Anima un número desde 0 hasta su valor final. */
function animarNumero(nodo, destino) {
  const inicio = performance.now();
  const duracion = 900;
  const paso = (ahora) => {
    const t = Math.min(1, (ahora - inicio) / duracion);
    const suave = 1 - (1 - t) ** 3;
    nodo.textContent = Math.round(destino * suave).toLocaleString('es-EC');
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

async function cargar() {
  let datos;
  try {
    const r = await fetch('/api/publico/inicio');
    datos = await r.json();
  } catch {
    return;
  }

  const { emprendimiento: e, ods, servicios, noticias, estadisticas } = datos;

  /* Lema y métricas del hero */
  document.getElementById('hero-metricas').innerHTML = e.metricas.map((m) => `
    <div>
      <div class="hero-metrica-valor">${esc(m.valor)}</div>
      <div class="hero-metrica-etiqueta">${esc(m.etiqueta)}</div>
    </div>`).join('');

  /* Estadísticas reales de la plataforma */
  const tarjetas = [
    { etiqueta: 'Clientes registrados', valor: estadisticas.clientes, icono: 'edificio', acento: 'var(--serie-3)' },
    { etiqueta: 'Proyectos de tratamiento', valor: estadisticas.proyectos, icono: 'planta', acento: 'var(--serie-2)' },
    { etiqueta: 'Análisis de agua', valor: estadisticas.muestreos, icono: 'matraz', acento: 'var(--serie-6)' },
    { etiqueta: 'Reportes emitidos', valor: estadisticas.reportes, icono: 'documento', acento: 'var(--serie-5)' },
  ];
  document.getElementById('estadisticas').innerHTML = tarjetas.map((t) => `
    <div class="indicador" style="--acento:${t.acento}">
      <span class="indicador-icono">${BC.icono(t.icono, { tam: 18 })}</span>
      <div class="indicador-etiqueta">${esc(t.etiqueta)}</div>
      <div class="indicador-valor" data-destino="${t.valor}">0</div>
    </div>`).join('');
  document.querySelectorAll('#estadisticas .indicador-valor').forEach((n) => {
    animarNumero(n, Number(n.dataset.destino) || 0);
  });

  /* Acerca del emprendimiento */
  document.getElementById('acerca-titulo').textContent = e.lema;
  document.getElementById('acerca-descripcion').textContent = e.descripcion;
  document.getElementById('acerca-bloques').innerHTML = `
    <div class="acerca-bloque">
      <h3>${BC.icono('alerta', { tam: 18, clase: 'icono-marca' })} El problema</h3>
      <p>${esc(e.problema)}</p>
    </div>
    <div class="acerca-bloque">
      <h3>${BC.icono('capsula', { tam: 18, clase: 'icono-marca' })} Nuestra solución</h3>
      <p>${esc(e.solucion)}</p>
    </div>
    <div class="acerca-bloque">
      <h3>${BC.icono('microscopio', { tam: 18, clase: 'icono-marca' })} Cómo lo comprobamos</h3>
      <p>Cada proyecto se documenta con 13 parámetros fisicoquímicos y biológicos medidos antes y después
         del tratamiento. La plataforma calcula la remoción, contrasta contra los límites máximos permisibles
         y emite un informe firmado con código QR de verificación pública.</p>
    </div>`;

  /* ODS */
  document.getElementById('ods-rejilla').innerHTML = ods.map((o) => `
    <article class="ods" style="--ods-color:${esc(o.color)}">
      <div class="ods-numero">${o.numero}</div>
      <div>
        <div class="ods-nombre">ODS ${o.numero} · ${esc(o.nombre)}</div>
        <div class="ods-aporte">${esc(o.aporte)}</div>
      </div>
    </article>`).join('');

  /* Servicios */
  document.getElementById('servicios-rejilla').innerHTML = servicios.map((s) => `
    <article class="servicio">
      <div class="servicio-icono">${BC.icono(s.icono, { tam: 21 })}</div>
      <h3>${esc(s.titulo)}</h3>
      <p>${esc(s.detalle)}</p>
    </article>`).join('');

  /* Noticias */
  const rejillaNoticias = document.getElementById('noticias-rejilla');
  rejillaNoticias.innerHTML = noticias.length
    ? noticias.map((n) => `
      <article class="noticia">
        <div class="noticia-meta">
          <span class="chip chip-marca">${esc(n.etiqueta || 'Novedad')}</span>
          <span>${esc(fecha(n.fecha))}</span>
        </div>
        <h3>${esc(n.titulo)}</h3>
        <p>${esc(n.resumen || '')}</p>
        ${n.cuerpo ? `<div class="noticia-cuerpo">${esc(n.cuerpo)}</div>` : ''}
      </article>`).join('')
    : '<p class="vacio">Todavía no hay noticias publicadas.</p>';
}

cargar();
