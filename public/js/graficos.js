/* ============================================================================
   BioCaps Monitor® — Gráficos (Módulo 13)

   Reglas aplicadas:
   · Un solo eje por gráfico; nunca dos escalas verticales.
   · Paleta categórica en orden fijo, validada para deficiencias de visión del
     color sobre la superficie oscura; el estado (semáforo) usa la paleta de
     estatus reservada y siempre va acompañado de etiqueta.
   · Marcas delgadas, extremos redondeados de 4 px anclados a la línea base,
     línea de 2 px, marcadores ≥ 8 px, separación de 2 px del color de fondo
     entre rellenos contiguos.
   · Rejilla y ejes discretos; leyenda presente con dos o más series; etiquetas
     directas selectivas; información en tabla siempre disponible junto al gráfico.
   ========================================================================= */

BC.graficos = (() => {
  const T = {
    superficie: '#0a201b',
    tinta: '#ffffff',
    tinta2: '#c3d8d0',
    apagado: '#8aa39b',
    rejilla: '#16332b',
    eje: '#24483d',
    series: ['#d95926', '#199e70', '#3987e5', '#d55181', '#c98500', '#9085e9', '#008300', '#e66767'],
    estado: { bueno: '#0ca30c', aviso: '#fab219', serio: '#ec835a', critico: '#d03b3b' },
  };

  /* Roles semánticos estables: la serie sigue a la entidad, nunca a su posición. */
  const ANTES = T.series[0];
  const DESPUES = T.series[1];

  /* Los dos primeros espacios quedan reservados a las etapas antes/después; los
     parámetros toman los siguientes en orden fijo, de modo que un mismo parámetro
     conserva su color en todas las pantallas y en el reporte PDF. */
  const COLOR_PARAMETRO = {
    nh4_n: T.series[2], dbo5: T.series[3], dqo: T.series[4],
    sst: T.series[5], turbidez: T.series[6], fosforo_total: T.series[7],
    coliformes_totales: T.series[2], sdt: T.series[3], conductividad: T.series[4],
    oxigeno_disuelto: T.series[5], ph: T.series[6], temperatura: T.series[7],
  };

  const colorParametro = (codigo, respaldo = 0) => COLOR_PARAMETRO[codigo] || T.series[respaldo % 8];

  const registro = new Map();

  function base() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = T.apagado;
    Chart.defaults.animation.duration = 550;
    Chart.defaults.plugins.tooltip.backgroundColor = '#113329';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,.14)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = T.tinta;
    Chart.defaults.plugins.tooltip.bodyColor = T.tinta2;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.boxPadding = 5;
    Chart.defaults.plugins.tooltip.displayColors = true;
  }

  /** Leyenda inferior común (siempre visible con dos o más series). */
  const leyenda = (mostrar = true) => ({
    display: mostrar,
    position: 'bottom',
    align: 'start',
    labels: {
      color: T.tinta2, usePointStyle: true, pointStyle: 'rectRounded',
      boxWidth: 10, boxHeight: 10, padding: 14,
    },
  });

  const ejeY = (titulo) => ({
    beginAtZero: true,
    border: { display: false },
    grid: { color: T.rejilla, drawTicks: false },
    ticks: { color: T.apagado, padding: 8, font: { size: 11 } },
    title: titulo ? { display: true, text: titulo, color: T.apagado, font: { size: 11 } } : undefined,
  });

  const ejeX = () => ({
    border: { color: T.eje },
    grid: { display: false },
    ticks: { color: T.tinta2, font: { size: 11 } },
  });

  /** Plugin: etiquetas directas sobre las barras (selectivas, no en cada punto). */
  const etiquetasBarras = {
    id: 'etiquetasBarras',
    afterDatasetsDraw(grafico, _args, opciones) {
      if (!opciones?.activo) return;
      const { ctx } = grafico;
      ctx.save();
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.fillStyle = T.tinta2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      grafico.data.datasets.forEach((conjunto, i) => {
        const meta = grafico.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((barra, j) => {
          const v = conjunto.data[j];
          if (v === null || v === undefined) return;
          const texto = opciones.formato ? opciones.formato(v) : BC.num(v, 0);
          ctx.fillText(texto, barra.x, barra.y - 4);
        });
      });
      ctx.restore();
    },
  };

  function crear(idCanvas, configuracion) {
    const canvas = document.getElementById(idCanvas);
    if (!canvas || typeof Chart === 'undefined') return null;
    registro.get(idCanvas)?.destroy();
    base();
    const grafico = new Chart(canvas, configuracion);
    registro.set(idCanvas, grafico);
    return grafico;
  }

  function destruirTodos() {
    for (const g of registro.values()) g.destroy();
    registro.clear();
  }

  /* ------------------ Barras agrupadas: Antes vs Después ------------------ */

  function barrasAntesDespues(idCanvas, filas, { unidad = 'mg/L', etiquetas = true } = {}) {
    return crear(idCanvas, {
      type: 'bar',
      data: {
        labels: filas.map((f) => f.etiqueta),
        datasets: [
          {
            label: 'Antes · afluente crudo',
            data: filas.map((f) => f.antes),
            backgroundColor: ANTES,
            // 2 px de separación del color de fondo entre barras contiguas
            borderColor: T.superficie,
            borderWidth: { top: 0, bottom: 0, left: 1, right: 1 },
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            maxBarThickness: 46,
          },
          {
            label: 'Después · efluente tratado',
            data: filas.map((f) => f.despues),
            backgroundColor: DESPUES,
            borderColor: T.superficie,
            borderWidth: { top: 0, bottom: 0, left: 1, right: 1 },
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            maxBarThickness: 46,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 18 } },
        categoryPercentage: 0.66,
        barPercentage: 0.88,
        scales: { x: ejeX(), y: ejeY(unidad) },
        plugins: {
          legend: leyenda(true),
          etiquetasBarras: { activo: etiquetas, formato: (v) => BC.num(v, v < 10 ? 1 : 0) },
          tooltip: {
            callbacks: {
              label: (c) => {
                const fila = filas[c.dataIndex];
                return `${c.dataset.label}: ${BC.num(c.parsed.y, 2)} ${fila.unidad || unidad}`;
              },
              afterBody: (items) => {
                const fila = filas[items[0].dataIndex];
                const partes = [];
                if (fila.reduccion !== null && fila.reduccion !== undefined) {
                  partes.push(`Remoción: ${BC.pct(fila.reduccion)}`);
                }
                if (fila.limite !== null && fila.limite !== undefined) {
                  partes.push(`Límite normativo: ${BC.num(fila.limite, 0)} ${fila.unidad || unidad}`);
                }
                return partes;
              },
            },
          },
        },
      },
      plugins: [etiquetasBarras],
    });
  }

  /* -------------- Barras horizontales: % de remoción por parámetro -------------- */

  function barrasRemocion(idCanvas, filas) {
    return crear(idCanvas, {
      type: 'bar',
      data: {
        labels: filas.map((f) => f.etiqueta),
        datasets: [{
          label: 'Remoción alcanzada',
          data: filas.map((f) => f.reduccion),
          backgroundColor: DESPUES,
          borderColor: T.superficie,
          borderWidth: { top: 1, bottom: 1, left: 0, right: 0 },
          borderRadius: { topRight: 4, bottomRight: 4, topLeft: 0, bottomLeft: 0 },
          borderSkipped: false,
          maxBarThickness: 22,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { ...ejeY('% de remoción'), max: 100, grid: { color: T.rejilla, drawTicks: false } },
          y: { ...ejeX(), grid: { display: false } },
        },
        plugins: {
          legend: leyenda(false),
          tooltip: { callbacks: { label: (c) => `Remoción: ${BC.pct(c.parsed.x)}` } },
        },
      },
    });
  }

  /* ------------------- Líneas: evolución mensual ------------------- */

  function lineasEvolucion(idCanvas, { etiquetas, series, unidad = 'mg/L' }) {
    return crear(idCanvas, {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: series.map((s, i) => ({
          label: s.etiqueta,
          data: s.datos,
          borderColor: s.color || T.series[i % T.series.length],
          backgroundColor: s.color || T.series[i % T.series.length],
          borderWidth: 2,
          borderDash: s.discontinua ? [5, 4] : undefined,
          tension: 0.32,
          pointRadius: 4.5,
          pointHoverRadius: 6.5,
          pointBorderWidth: 2,
          pointBorderColor: T.superficie,
          spanGaps: true,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: { x: ejeX(), y: ejeY(unidad) },
        plugins: {
          legend: leyenda(series.length > 1),
          tooltip: {
            callbacks: { label: (c) => `${c.dataset.label}: ${BC.num(c.parsed.y, 2)} ${unidad}` },
          },
        },
      },
    });
  }

  /* ------------------- Gauge: cumplimiento normativo ------------------- */

  function gaugeCumplimiento(idCanvas, porcentaje, { idValor, idEtiqueta } = {}) {
    const v = Math.max(0, Math.min(100, Number(porcentaje) || 0));
    const color = v >= 90 ? T.estado.bueno : v >= 70 ? T.estado.aviso : T.estado.critico;
    const etiqueta = v >= 90 ? 'Cumple' : v >= 70 ? 'Parcial' : 'No cumple';

    if (idValor) document.getElementById(idValor).textContent = `${BC.num(v, 0)}%`;
    if (idEtiqueta) {
      const nodo = document.getElementById(idEtiqueta);
      nodo.textContent = etiqueta;
      nodo.style.color = color;
    }

    return crear(idCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Cumple', 'No cumple'],
        datasets: [{
          data: [v, 100 - v],
          backgroundColor: [color, 'rgba(255,255,255,.07)'],
          borderColor: T.superficie,
          borderWidth: 2,
          circumference: 220,
          rotation: 250,
          cutout: '76%',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (c) => `${c.label}: ${BC.num(c.parsed, 0)} % de los parámetros` },
          },
        },
      },
    });
  }

  /* ------------------- Pastel: distribución categórica ------------------- */

  function pastel(idCanvas, datos, { titulo = '' } = {}) {
    return crear(idCanvas, {
      type: 'doughnut',
      data: {
        labels: datos.map((d) => d.etiqueta),
        datasets: [{
          data: datos.map((d) => d.valor),
          backgroundColor: datos.map((d, i) => d.color || T.series[i % T.series.length]),
          // Anillo de 2 px del color de fondo entre porciones contiguas
          borderColor: T.superficie,
          borderWidth: 2,
          hoverOffset: 6,
          cutout: '52%',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: leyenda(true),
          tooltip: {
            callbacks: {
              label: (c) => {
                const total = c.dataset.data.reduce((s, x) => s + x, 0) || 1;
                return `${c.label}: ${BC.num(c.parsed, 0)} (${BC.num((c.parsed / total) * 100, 0)} %)`;
              },
            },
          },
        },
      },
    });
  }

  /* ------- Radar: comparación de parámetros respecto al límite normativo ------- */

  function radarParametros(idCanvas, filas) {
    return crear(idCanvas, {
      type: 'radar',
      data: {
        labels: filas.map((f) => f.etiqueta),
        datasets: [
          {
            label: 'Antes del tratamiento',
            data: filas.map((f) => f.antes),
            borderColor: ANTES,
            backgroundColor: 'rgba(217, 89, 38, .16)',
            borderWidth: 2, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: T.superficie,
            pointBackgroundColor: ANTES,
          },
          {
            label: 'Después del tratamiento',
            data: filas.map((f) => f.despues),
            borderColor: DESPUES,
            backgroundColor: 'rgba(25, 158, 112, .18)',
            borderWidth: 2, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: T.superficie,
            pointBackgroundColor: DESPUES,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            min: 0,
            max: 100,
            angleLines: { color: T.rejilla },
            grid: { color: T.rejilla },
            pointLabels: { color: T.tinta2, font: { size: 11, weight: '600' } },
            ticks: {
              color: T.apagado, backdropColor: 'transparent',
              stepSize: 25, font: { size: 10 },
            },
          },
        },
        plugins: {
          legend: leyenda(true),
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ${BC.num(c.parsed.r, 0)}/100`,
              afterBody: (items) => {
                const f = filas[items[0].dataIndex];
                return f?.reduccion === null || f?.reduccion === undefined
                  ? ['100 = calidad óptima del parámetro']
                  : [`Remoción: ${BC.pct(f.reduccion)}`, '100 = calidad óptima del parámetro'];
              },
            },
          },
        },
      },
    });
  }

  /* ------------------- Barras apiladas: semáforo global ------------------- */

  function barrasSemaforo(idCanvas, semaforo) {
    return crear(idCanvas, {
      type: 'bar',
      data: {
        labels: ['Parámetros evaluados'],
        datasets: [
          { label: 'Excelente', data: [semaforo.excelente], backgroundColor: T.estado.bueno },
          { label: 'Aceptable', data: [semaforo.aceptable], backgroundColor: T.estado.aviso },
          { label: 'Crítico', data: [semaforo.critico], backgroundColor: T.estado.critico },
        ].map((d) => ({
          ...d,
          borderColor: T.superficie,
          borderWidth: { top: 0, bottom: 0, left: 1, right: 1 },
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 34,
        })),
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { stacked: true, ...ejeY('Número de parámetros') },
          y: { stacked: true, ...ejeX(), grid: { display: false } },
        },
        plugins: {
          legend: leyenda(true),
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.x} parámetro(s)` } },
        },
      },
    });
  }

  /* ---------------------------- Mapa de proyectos ---------------------------- */

  let mapaInstancia = null;

  function mapaProyectos(idDiv, proyectos, { alSeleccionar } = {}) {
    const div = document.getElementById(idDiv);
    if (!div || typeof L === 'undefined') return null;

    if (mapaInstancia) { mapaInstancia.remove(); mapaInstancia = null; }
    div.innerHTML = '';

    const conCoordenadas = proyectos.filter((p) => p.latitud && p.longitud);
    const centro = conCoordenadas.length
      ? [conCoordenadas[0].latitud, conCoordenadas[0].longitud]
      : [-0.2542, -79.1750];

    const mapa = L.map(div, { scrollWheelZoom: false, attributionControl: true }).setView(centro, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(mapa);

    const marcadores = [];
    for (const p of conCoordenadas) {
      const color = p.calidad?.color || '#8aa39b';
      const inicial = (p.tipo_agua || '?').charAt(0);
      const icono = L.divIcon({
        className: '',
        html: `<div class="marcador-proyecto" style="background:${color}" title="${BC.esc(p.nombre)}">${inicial}</div>`,
        iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12],
      });

      const marcador = L.marker([p.latitud, p.longitud], { icon: icono }).addTo(mapa);
      marcador.bindPopup(`
        <b>${BC.esc(p.nombre)}</b><br>
        ${BC.esc(p.cliente || '')}<br>
        <span class="pequeno">${BC.esc(p.ubicacion || '')}</span><br>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,.12);margin:.45rem 0">
        Tipo de agua: <b>${BC.esc(p.tipo_agua)}</b><br>
        Estado: <b>${BC.esc(p.estado)}</b><br>
        Remoción promedio: <b>${BC.pct(p.reduccion)}</b><br>
        Cumplimiento: <b>${p.cumplimiento === null ? '—' : BC.pct(p.cumplimiento, 0)}</b><br>
        Calidad del agua: <b>${p.calidad ? `${p.calidad.emoji || ''} ${BC.esc(p.calidad.etiqueta)}` : '—'}</b>
        ${alSeleccionar ? `<br><a href="#/proyecto/${p.id}">Ver proyecto →</a>` : ''}
      `);
      marcadores.push(marcador);
    }

    if (marcadores.length > 1) {
      mapa.fitBounds(L.featureGroup(marcadores).getBounds().pad(0.25));
    } else if (marcadores.length === 1) {
      mapa.setView(marcadores[0].getLatLng(), 13);
    }

    mapaInstancia = mapa;
    setTimeout(() => mapa.invalidateSize(), 120);
    return mapa;
  }

  /** Imágenes PNG de los gráficos, para incrustarlas en el reporte PDF. */
  function imagen(idCanvas) {
    const g = registro.get(idCanvas);
    if (!g) return null;
    return g.toBase64Image('image/png', 1);
  }

  return {
    T, ANTES, DESPUES, colorParametro,
    barrasAntesDespues, barrasRemocion, lineasEvolucion, gaugeCumplimiento,
    pastel, radarParametros, barrasSemaforo, mapaProyectos,
    imagen, destruirTodos, crear,
  };
})();
