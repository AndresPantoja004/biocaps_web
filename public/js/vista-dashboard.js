/* ============================================================================
   BioCaps Monitor® — Módulo 3: Dashboard principal
   Tarjetas dinámicas + los seis gráficos del Módulo 13.
   ========================================================================= */

BC.vistaDashboard = async function vistaDashboard(contenedor) {
  const d = await BC.api('/dashboard');
  const t = d.tarjetas;

  BC.app.cabecera(
    'Dashboard ejecutivo',
    `Indicadores consolidados${t.proyectos_analizados ? ` de ${t.proyectos_analizados} proyecto(s) con análisis comparativo completo` : ''}`,
    `<button class="btn btn-fantasma btn-sm" id="btn-refrescar" type="button">${BC.icono('refrescar', { tam: 14 })} Actualizar</button>
     ${BC.sesion.puedeEditar() ? `<a class="btn btn-sm" href="#/analisis/nuevo">${BC.icono('mas', { tam: 14 })} Registrar análisis</a>` : ''}`,
  );

  /* --------------------------- Tarjetas dinámicas --------------------------- */

  const tarjetas = [
    BC.indicador({
      etiqueta: 'Total clientes', valor: BC.num(t.total_clientes, 0), icono: 'edificio',
      acento: 'var(--serie-3)', pie: `${t.total_proyectos} proyecto(s) asociado(s)`,
    }),
    BC.indicador({
      etiqueta: 'Total proyectos', valor: BC.num(t.total_proyectos, 0), icono: 'planta',
      acento: 'var(--serie-6)', pie: `${t.total_muestreos} análisis de agua registrados`,
    }),
    BC.indicador({
      etiqueta: 'Tratamientos activos', valor: BC.num(t.tratamientos_activos, 0), icono: 'rayo',
      acento: 'var(--estado-bueno)', pie: `${t.lotes_vigentes} lote(s) de biocápsulas vigente(s)`,
    }),
    BC.indicador({
      etiqueta: 'Tratamientos finalizados', valor: BC.num(t.tratamientos_finalizados, 0), icono: 'check-circulo',
      acento: 'var(--muted)', pie: `${t.total_reportes} reporte(s) técnico(s) emitido(s)`,
    }),
    BC.indicador({
      etiqueta: 'Reducción promedio de contaminantes',
      valor: t.reduccion_promedio === null ? '—' : BC.num(t.reduccion_promedio, 1), unidad: '%',
      icono: 'tendencia-baja', acento: 'var(--serie-2)',
      pie: 'Parámetros clave: NH₄⁺-N, DBO₅, DQO, SST, turbidez, P-Total, coliformes',
    }),
    BC.indicador({
      etiqueta: 'Cumplimiento normativo',
      valor: t.cumplimiento_normativo === null ? '—' : BC.num(t.cumplimiento_normativo, 0), unidad: '%',
      icono: 'balanza', acento: 'var(--serie-5)',
      pie: 'Parámetros del efluente dentro del límite permisible',
    }),
    BC.indicador({
      etiqueta: 'Calidad del agua tratada',
      valor: t.ica === null ? '—' : `${BC.num(t.ica, 0)}<small>/100</small>`,
      icono: 'gota', acento: t.calidad_agua?.color || 'var(--brand)',
      estado: t.calidad_agua ? { clave: t.calidad_agua.clave, etiqueta: t.calidad_agua.etiqueta, emoji: t.calidad_agua.emoji } : null,
    }),
    BC.indicador({
      etiqueta: 'Análisis de agua', valor: BC.num(t.total_muestreos, 0), icono: 'matraz',
      acento: 'var(--serie-4)', pie: 'Muestreos antes y después del tratamiento',
    }),
  ];

  /* ------------------------ Datos para los gráficos ------------------------ */

  // Barras: sólo parámetros en mg/L, para respetar un único eje con una sola unidad.
  const barras = d.barras.filter((b) => b.unidad === 'mg/L' && (b.antes !== null || b.despues !== null));

  // Radar: sub-índice de calidad 0–100 por parámetro (acotado, comparable entre unidades).
  const radar = d.radar.filter((x) => x.antes !== null || x.despues !== null);

  // Líneas: concentración media mensual del efluente tratado (una sola unidad, mg/L).
  const meses = [...new Set(d.mensual_parametros.map((m) => m.mes))].sort();
  const codigos = ['nh4_n', 'dbo5', 'dqo'];
  const seriesMensuales = codigos.map((codigo) => {
    const simbolo = d.mensual_parametros.find((m) => m.codigo === codigo)?.simbolo || codigo;
    return {
      etiqueta: `${simbolo} · efluente`,
      color: BC.graficos.colorParametro(codigo),
      datos: meses.map((mes) => {
        const f = d.mensual_parametros.find((m) => m.mes === mes && m.codigo === codigo && m.etapa === 'despues');
        return f ? Number(f.promedio.toFixed(2)) : null;
      }),
    };
  }).filter((s) => s.datos.some((v) => v !== null));

  const pastelClientes = d.pastel.map((p) => ({ etiqueta: p.tipo, valor: p.total }));
  const pastelAgua = d.tipos_agua.map((p) => ({ etiqueta: p.tipo, valor: p.total }));

  /* ------------------------------ Composición ------------------------------ */

  contenedor.innerHTML = `
    <section class="rejilla rejilla-4">${tarjetas.join('')}</section>

    ${d.alertas.length ? `
      <section class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>${BC.icono('cerebro', { tam: 17, clase: 'icono-marca' })} Inteligencia del software — alertas activas</h3>
          <span class="chip">${d.alertas.length} alerta(s)</span>
        </div>
        ${d.alertas.map((a) => BC.avisoInteligente({
    ...a, titulo: `${a.titulo} · ${a.proyecto}`,
  })).join('')}
      </section>` : ''}

    <section class="rejilla" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>Antes vs Después del tratamiento</h3>
          <span class="chip">Promedio de todos los proyectos · mg/L</span>
        </div>
        ${barras.length
    ? '<div class="grafico-caja grafico-alto-2"><canvas id="g-barras"></canvas></div>'
    : BC.vacio('Registre un muestreo antes y otro después para comparar.', 'grafico-barras')}
      </div>

      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Cumplimiento normativo</h3></div>
        <div class="gauge grafico-caja grafico-alto-1">
          <canvas id="g-gauge"></canvas>
          <div class="gauge-centro">
            <span class="gauge-valor" id="gauge-valor">—</span>
            <span class="gauge-etiqueta" id="gauge-etiqueta">Sin datos</span>
          </div>
        </div>
        <p class="pequeno tenue" style="margin:0">
          Porcentaje de parámetros del efluente que cumplen el límite máximo permisible configurado.
        </p>
      </div>
    </section>

    <section class="rejilla rejilla-2">
      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>Evolución mensual del efluente</h3>
          <span class="chip">mg/L</span>
        </div>
        ${seriesMensuales.length
    ? '<div class="grafico-caja grafico-alto-2"><canvas id="g-lineas"></canvas></div>'
    : BC.vacio('Aún no hay suficientes campañas mensuales.', 'grafico-linea')}
      </div>

      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>Comparación de parámetros</h3>
          <span class="chip">Sub-índice de calidad · 100 = óptimo</span>
        </div>
        ${radar.length
    ? '<div class="grafico-caja grafico-alto-2"><canvas id="g-radar"></canvas></div>'
    : BC.vacio('Sin análisis comparativos disponibles.', 'radar')}
      </div>
    </section>

    <section class="rejilla rejilla-3">
      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Tipos de clientes</h3></div>
        ${pastelClientes.length
    ? '<div class="grafico-caja grafico-alto-1"><canvas id="g-pastel"></canvas></div>'
    : BC.vacio('Sin clientes registrados.', 'pastel')}
      </div>

      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Tipos de agua tratada</h3></div>
        ${pastelAgua.length
    ? '<div class="grafico-caja grafico-alto-1"><canvas id="g-pastel-agua"></canvas></div>'
    : BC.vacio('Sin proyectos registrados.', 'gota')}
      </div>

      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Semáforo consolidado</h3></div>
        ${(d.semaforo.excelente + d.semaforo.aceptable + d.semaforo.critico)
    ? `<div class="grafico-caja" style="height:130px"><canvas id="g-semaforo"></canvas></div>
       <div class="datos-lista" style="margin-top:.5rem">
         <div class="dato"><div class="dato-etiqueta">Excelente</div><div class="dato-valor"><span class="punto-estado" style="--color-estado:var(--estado-bueno)"></span> ${d.semaforo.excelente}</div></div>
         <div class="dato"><div class="dato-etiqueta">Aceptable</div><div class="dato-valor"><span class="punto-estado" style="--color-estado:var(--estado-aviso)"></span> ${d.semaforo.aceptable}</div></div>
         <div class="dato"><div class="dato-etiqueta">Crítico</div><div class="dato-valor"><span class="punto-estado" style="--color-estado:var(--estado-critico)"></span> ${d.semaforo.critico}</div></div>
       </div>`
    : BC.vacio('Sin parámetros evaluados.', 'objetivo')}
      </div>
    </section>

    <section class="tarjeta">
      <div class="tarjeta-titulo">
        <h3>Mapa de proyectos</h3>
        <span class="chip">El color del marcador indica la calidad del efluente</span>
      </div>
      ${d.mapa.length
    ? '<div class="mapa" id="mapa-proyectos"></div>'
    : BC.vacio('Registre las coordenadas de sus proyectos para verlos en el mapa.', 'mapa')}
    </section>

    <section class="rejilla" style="grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)">
      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>Eficiencia por proyecto</h3>
          <span class="chip">Tabla de datos de los gráficos</span>
        </div>
        ${d.ranking.length ? `
          <div class="tabla-envoltura tabla-ancha">
            <table>
              <thead>
                <tr>
                  <th>Proyecto</th><th>Cliente</th>
                  <th class="num">Remoción</th><th class="num">Cumplimiento</th>
                  <th class="num">ICA</th><th>Calidad</th>
                </tr>
              </thead>
              <tbody>
                ${d.ranking.map((r) => `
                  <tr>
                    <td><a href="#/proyecto/${r.id}"><strong>${BC.esc(r.nombre)}</strong></a></td>
                    <td>${BC.esc(r.cliente)}</td>
                    <td class="num">${BC.pct(r.reduccion)}</td>
                    <td class="num">${BC.pct(r.cumplimiento, 0)}</td>
                    <td class="num">${BC.num(r.ica, 0)}</td>
                    <td>${BC.estado(r.calidad)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : BC.vacio('Sin proyectos con análisis comparativo.', 'documento')}
      </div>

      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Actividad reciente</h3></div>
        ${d.actividad.length ? `
          <div class="tiempo">
            ${d.actividad.map((a) => `
              <div class="tiempo-item">
                <div class="tiempo-punto">•</div>
                <div>
                  <div class="tiempo-titulo">${BC.esc(a.accion)}</div>
                  <div class="tiempo-meta">
                    ${BC.esc(a.detalle || a.entidad || '')} · ${BC.esc(a.usuario || 'sistema')}
                  </div>
                  <div class="tiempo-meta">${BC.fechaHora(a.created_at)}</div>
                </div>
              </div>`).join('')}
          </div>` : BC.vacio('Sin actividad registrada.', 'reloj')}
      </div>
    </section>`;

  /* ------------------------------ Gráficos ------------------------------ */

  if (barras.length) BC.graficos.barrasAntesDespues('g-barras', barras);

  BC.graficos.gaugeCumplimiento('g-gauge', t.cumplimiento_normativo ?? 0, {
    idValor: 'gauge-valor', idEtiqueta: 'gauge-etiqueta',
  });
  if (t.cumplimiento_normativo === null) {
    document.getElementById('gauge-valor').textContent = '—';
    document.getElementById('gauge-etiqueta').textContent = 'Sin datos';
  }

  if (seriesMensuales.length) {
    BC.graficos.lineasEvolucion('g-lineas', {
      etiquetas: meses.map(BC.mesNombre), series: seriesMensuales,
    });
  }
  if (radar.length) BC.graficos.radarParametros('g-radar', radar);
  if (pastelClientes.length) BC.graficos.pastel('g-pastel', pastelClientes);
  if (pastelAgua.length) {
    BC.graficos.pastel('g-pastel-agua', pastelAgua.map((p, i) => ({
      ...p, color: BC.graficos.T.series[(i + 2) % 8],
    })));
  }
  if (d.semaforo.excelente + d.semaforo.aceptable + d.semaforo.critico) {
    BC.graficos.barrasSemaforo('g-semaforo', d.semaforo);
  }
  if (d.mapa.length) BC.graficos.mapaProyectos('mapa-proyectos', d.mapa, { alSeleccionar: true });

  document.getElementById('btn-refrescar')?.addEventListener('click', () => BC.app.enrutar());
};
