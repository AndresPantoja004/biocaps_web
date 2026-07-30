/* ============================================================================
   BioCaps Monitor® — Módulo 14: Histórico de reportes PDF  ·  Histórico general
   ========================================================================= */

BC.vistaReportes = async function vistaReportes(contenedor) {
  const [reportes, proyectos] = await Promise.all([BC.api('/reportes'), BC.api('/proyectos')]);

  const conPar = proyectos.filter((p) => p.total_muestreos >= 2);

  BC.app.cabecera(
    'Reportes técnicos',
    `${reportes.length} reporte(s) emitido(s) · cada uno verificable por código QR`,
    `${BC.sesion.puedeEditar() && conPar.length
      ? `<button class="btn btn-sm" id="btn-emitir" type="button">${BC.icono('documento', { tam: 14 })} Emitir nuevo reporte</button>` : ''}`,
  );

  contenedor.innerHTML = `
    <section class="rejilla rejilla-4">
      ${BC.indicador({ etiqueta: 'Reportes emitidos', valor: reportes.length, icono: 'documento', acento: 'var(--serie-5)' })}
      ${BC.indicador({
    etiqueta: 'Remoción promedio informada',
    valor: BC.num(BC.promedioSeguro(reportes.map((r) => r.resumen?.reduccion_promedio)), 1), unidad: '%',
    icono: 'tendencia-baja', acento: 'var(--serie-2)',
  })}
      ${BC.indicador({
    etiqueta: 'Reportes con cumplimiento total',
    valor: reportes.filter((r) => r.resumen?.cumplimiento_pct === 100).length,
    icono: 'check-circulo', acento: 'var(--estado-bueno)',
    pie: `de ${reportes.length} emitidos`,
  })}
      ${BC.indicador({
    etiqueta: 'Proyectos documentados',
    valor: new Set(reportes.map((r) => r.proyecto_id)).size,
    icono: 'planta', acento: 'var(--serie-3)',
  })}
    </section>

    <section class="tarjeta">
      <div class="tarjeta-titulo">
        <h3>Histórico de reportes</h3>
        <input id="f-reportes" type="search" placeholder="Código, proyecto, cliente…" style="max-width:260px">
      </div>

      ${reportes.length ? `
        <div class="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Proyecto / cliente</th><th>Muestras</th>
                <th class="num">Remoción</th><th class="num">Cumplimiento</th>
                <th>Emitido</th><th>Firma</th><th></th>
              </tr>
            </thead>
            <tbody id="cuerpo-reportes"></tbody>
          </table>
        </div>` : BC.vacio('Todavía no se ha emitido ningún reporte técnico.', 'documento')}
    </section>`;

  function pintar() {
    const cuerpo = document.getElementById('cuerpo-reportes');
    if (!cuerpo) return;
    const q = (document.getElementById('f-reportes')?.value || '').trim().toLowerCase();

    const filtrados = reportes.filter((r) => !q || [r.codigo, r.proyecto_nombre, r.cliente_nombre, r.firma_nombre]
      .some((v) => String(v ?? '').toLowerCase().includes(q)));

    cuerpo.innerHTML = filtrados.map((r) => `
      <tr>
        <td><strong class="mono">${BC.esc(r.codigo)}</strong></td>
        <td>
          <a href="#/proyecto/${r.proyecto_id}/analisis">${BC.esc(r.proyecto_nombre)}</a>
          <div class="pequeno tenue">${BC.esc(r.cliente_nombre)}</div>
        </td>
        <td class="pequeno">${BC.esc(r.muestreo_antes || '—')} → ${BC.esc(r.muestreo_despues || '—')}</td>
        <td class="num">${BC.pct(r.resumen?.reduccion_promedio)}</td>
        <td class="num">
          ${r.resumen?.cumplimiento_pct === undefined || r.resumen?.cumplimiento_pct === null ? '—' : `
            <span class="estado estado-${r.resumen.cumplimiento_pct === 100 ? 'excelente' : r.resumen.cumplimiento_pct >= 70 ? 'aceptable' : 'critico'}">
              ${BC.num(r.resumen.cumplimiento_pct, 0)} %
            </span>`}
        </td>
        <td class="pequeno">
          ${BC.fechaHora(r.created_at)}
          <div class="tenue">${BC.esc(r.generado_por || '')}</div>
        </td>
        <td class="pequeno">
          ${BC.esc(r.firma_nombre || '—')}
          <div class="tenue">${BC.esc(r.firma_cargo || '')}</div>
        </td>
        <td class="derecha" style="white-space:nowrap">
          <button class="btn btn-suave btn-sm" data-pdf="${r.id}" type="button">${BC.icono('descargar', { tam: 13 })} PDF</button>
          <a class="btn btn-fantasma btn-sm" href="/verificar/${BC.esc(r.token)}" target="_blank" rel="noopener">${BC.icono('qr', { tam: 13 })} Verificar</a>
          ${BC.sesion.puedeEditar() ? `<button class="btn btn-peligro btn-sm" data-anular="${r.id}" type="button">Anular</button>` : ''}
        </td>
      </tr>`).join('') || `<tr><td colspan="8">${BC.vacio('Ningún reporte coincide con la búsqueda.', 'buscar')}</td></tr>`;

    for (const btn of cuerpo.querySelectorAll('[data-pdf]')) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        await BC.reportes.reimprimir(Number(btn.dataset.pdf));
        btn.disabled = false;
      });
    }
    for (const btn of cuerpo.querySelectorAll('[data-anular]')) {
      btn.addEventListener('click', async () => {
        const r = reportes.find((x) => x.id === Number(btn.dataset.anular));
        const ok = await BC.modal.confirmar({
          titulo: 'Anular reporte',
          mensaje: `¿Anular el reporte ${r.codigo}? Su código QR dejará de validar.`,
          textoAceptar: 'Anular', peligro: true,
        });
        if (!ok) return;
        try {
          await BC.api(`/reportes/${r.id}`, { method: 'DELETE' });
          BC.exito('Reporte anulado.');
          await BC.app.enrutar();
          BC.app.actualizarContadores();
        } catch (e) { BC.error(e); }
      });
    }
  }

  document.getElementById('f-reportes')?.addEventListener('input', pintar);
  pintar();

  document.getElementById('btn-emitir')?.addEventListener('click', () => {
    BC.modal.abrir({
      titulo: 'Emitir reporte técnico',
      ancho: '560px',
      cuerpo: `
        <p class="pequeno tenue">
          El reporte se genera desde la comparativa antes/después del proyecto, de modo que incluya
          también los gráficos. Seleccione el proyecto para abrir su análisis.
        </p>
        ${BC.formulario([{
    nombre: 'proyecto_id', etiqueta: 'Proyecto', tipo: 'select', requerido: true, ancho: 'completo',
    opciones: conPar.map((p) => ({ valor: p.id, texto: `${p.nombre} · ${p.cliente_nombre}` })),
  }])}`,
      acciones: [
        { texto: 'Cancelar', al: ({ cerrar }) => cerrar() },
        {
          texto: 'Abrir análisis →',
          clase: 'btn',
          al: ({ cerrar, modal }) => {
            const form = modal.querySelector('form');
            if (!BC.validarFormulario(form)) return;
            const id = form.proyecto_id.value;
            cerrar();
            location.hash = `#/proyecto/${id}/analisis`;
            BC.notificar('Use el botón "Generar reporte PDF" de esta pantalla.');
          },
        },
      ],
    });
  });
};

/** Promedio que ignora valores nulos (usado en las tarjetas de resumen). */
BC.promedioSeguro = (valores) => {
  const v = valores.filter((x) => x !== null && x !== undefined && Number.isFinite(Number(x))).map(Number);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

/* ============================== Histórico ============================== */

BC.vistaHistorial = async function vistaHistorial(contenedor) {
  const datos = await BC.api('/historial?limite=250');

  BC.app.cabecera(
    'Histórico del sistema',
    `${datos.total} evento(s) registrados · trazabilidad completa de las operaciones`,
    `<button class="btn btn-fantasma btn-sm" id="btn-csv-h" type="button">${BC.icono('descargar', { tam: 14 })} CSV</button>`,
  );

  const entidades = [...new Set(datos.registros.map((r) => r.entidad).filter(Boolean))].sort();

  contenedor.innerHTML = `
    <section class="filtros">
      <div class="campo">
        <label for="f-h-q">Buscar</label>
        <input id="f-h-q" type="search" placeholder="Acción, detalle, usuario…">
      </div>
      <div class="campo">
        <label for="f-h-entidad">Módulo</label>
        <select id="f-h-entidad">
          <option value="">Todos</option>
          ${entidades.map((e) => `<option value="${BC.esc(e)}">${BC.esc(e)}</option>`).join('')}
        </select>
      </div>
      <div class="filtros-acciones"><span class="chip" id="contador-h"></span></div>
    </section>

    <section class="tarjeta">
      <div class="tabla-envoltura">
        <table>
          <thead>
            <tr><th>Fecha y hora</th><th>Acción</th><th>Módulo</th><th>Detalle</th><th>Usuario</th></tr>
          </thead>
          <tbody id="cuerpo-h"></tbody>
        </table>
      </div>
      <div id="sin-h"></div>
    </section>`;

  function pintar() {
    const q = document.getElementById('f-h-q').value.trim().toLowerCase();
    const entidad = document.getElementById('f-h-entidad').value;

    const filtrados = datos.registros.filter((r) => {
      const coincide = !q || [r.accion, r.detalle, r.usuario]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
      return coincide && (!entidad || r.entidad === entidad);
    });

    document.getElementById('contador-h').textContent = `${filtrados.length} de ${datos.registros.length}`;
    document.getElementById('sin-h').innerHTML = filtrados.length ? '' : BC.vacio('Ningún evento coincide.', 'buscar');

    document.getElementById('cuerpo-h').innerHTML = filtrados.map((r) => `
      <tr>
        <td class="pequeno mono">${BC.fechaHora(r.created_at)}</td>
        <td><strong>${BC.esc(r.accion)}</strong></td>
        <td><span class="chip">${BC.icono(BC.iconoEntidad(r.entidad), { tam: 13 })} ${BC.esc(r.entidad || '—')}</span></td>
        <td class="pequeno">${BC.esc(r.detalle || '—')}</td>
        <td class="pequeno">${BC.esc(r.usuario || 'sistema')}</td>
      </tr>`).join('');
  }

  document.getElementById('f-h-q').addEventListener('input', pintar);
  document.getElementById('f-h-entidad').addEventListener('change', pintar);
  document.getElementById('btn-csv-h').addEventListener('click', () => {
    const filas = [['Fecha', 'Acción', 'Módulo', 'Detalle', 'Usuario']];
    for (const r of datos.registros) filas.push([r.created_at, r.accion, r.entidad, r.detalle, r.usuario]);
    BC.descargar(BC.aCSV(filas), 'biocaps-historial.csv');
  });

  pintar();
};
