/* ============================================================================
   BioCaps Monitor®
   Módulo 7  — Registro de análisis de agua (el más importante)
   Módulo 8  — Parámetros fisicoquímicos y biológicos
   Módulo 11 — Algoritmos automáticos (reducción porcentual)
   Módulo 12 — Indicadores automáticos (semáforo)
   ========================================================================= */

/* Clasificación en el navegador, espejo de la del servidor, para que el
   semáforo y el % de remoción se actualicen mientras se escriben los valores. */
function clasificarLocal(p, valor) {
  const sinDato = { clave: 'sin_dato', etiqueta: 'Sin dato' };
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(Number(valor))) return sinDato;
  const v = Number(valor);
  const exc = { clave: 'excelente', etiqueta: 'Excelente' };
  const acep = { clave: 'aceptable', etiqueta: 'Aceptable' };
  const crit = { clave: 'critico', etiqueta: 'Crítico' };

  if (p.direccion === 'reducir') {
    if (p.limite_excelente !== null && v <= p.limite_excelente) return exc;
    if (p.limite_aceptable !== null && v <= p.limite_aceptable) return acep;
    return p.limite_aceptable === null ? sinDato : crit;
  }
  if (p.direccion === 'aumentar') {
    if (p.limite_excelente !== null && v >= p.limite_excelente) return exc;
    if (p.limite_aceptable !== null && v >= p.limite_aceptable) return acep;
    return p.limite_aceptable === null ? sinDato : crit;
  }
  if (p.direccion === 'rango') {
    if (p.rango_ideal_min !== null && v >= p.rango_ideal_min && v <= p.rango_ideal_max) return exc;
    if (p.rango_min !== null && v >= p.rango_min && v <= p.rango_max) return acep;
    return p.rango_min === null ? sinDato : crit;
  }
  return sinDato;
}

function textoLimite(p) {
  if (p.tipo === 'cualitativo') return p.normativa || 'Descripción organoléptica';
  if (p.direccion === 'rango') return `Permisible ${p.rango_min}–${p.rango_max} · ideal ${p.rango_ideal_min}–${p.rango_ideal_max}`;
  if (p.direccion === 'aumentar') return `Excelente ≥ ${p.limite_excelente} · aceptable ≥ ${p.limite_aceptable}`;
  return `Excelente ≤ ${p.limite_excelente} · límite ${p.limite_aceptable}`;
}

/* ==================== Listado general de análisis ==================== */

BC.vistaAnalisis = async function vistaAnalisis(contenedor, parametros) {
  if (parametros[0] === 'nuevo') return formularioMuestreo(contenedor, parametros[1]);

  const [muestreos, proyectos] = await Promise.all([BC.api('/muestreos'), BC.api('/proyectos')]);

  BC.app.cabecera(
    'Análisis de agua',
    `${muestreos.length} muestreo(s) registrado(s) · ${muestreos.filter((m) => m.etapa === 'antes').length} antes / ${muestreos.filter((m) => m.etapa === 'despues').length} después`,
    `${BC.sesion.puedeEditar() ? `<a class="btn btn-sm" href="#/analisis/nuevo">${BC.icono('mas', { tam: 14 })} Registrar análisis</a>` : ''}`,
  );

  contenedor.innerHTML = `
    <section class="filtros">
      <div class="campo">
        <label for="f-proyecto">Proyecto</label>
        <select id="f-proyecto">
          <option value="">Todos</option>
          ${proyectos.map((p) => `<option value="${p.id}">${BC.esc(p.nombre)}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="f-etapa">Etapa</label>
        <select id="f-etapa">
          <option value="">Todas</option>
          <option value="antes">Antes del tratamiento</option>
          <option value="despues">Después del tratamiento</option>
        </select>
      </div>
      <div class="campo">
        <label for="f-q">Buscar</label>
        <input id="f-q" type="search" placeholder="Código, punto, responsable…">
      </div>
      <div class="filtros-acciones"><span class="chip" id="contador-m"></span></div>
    </section>

    <section class="tarjeta">
      <div class="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Muestra</th><th>Proyecto</th><th>Etapa</th><th>Fecha</th>
              <th>Punto</th><th>Lote</th><th class="num">Parámetros</th><th></th>
            </tr>
          </thead>
          <tbody id="cuerpo-m"></tbody>
        </table>
      </div>
      <div id="sin-m"></div>
    </section>`;

  function pintar() {
    const proyecto = document.getElementById('f-proyecto').value;
    const etapa = document.getElementById('f-etapa').value;
    const q = document.getElementById('f-q').value.trim().toLowerCase();

    const filtrados = muestreos.filter((m) => {
      const coincide = !q || [m.codigo, m.punto_codigo, m.responsable, m.proyecto_nombre]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
      return coincide
        && (!proyecto || m.proyecto_id === Number(proyecto))
        && (!etapa || m.etapa === etapa);
    });

    document.getElementById('contador-m').textContent = `${filtrados.length} de ${muestreos.length}`;
    document.getElementById('sin-m').innerHTML = filtrados.length ? '' : BC.vacio('Ningún análisis coincide con el filtro.', 'buscar');

    document.getElementById('cuerpo-m').innerHTML = filtrados.map((m) => `
      <tr>
        <td><strong>${BC.esc(m.codigo)}</strong></td>
        <td><a href="#/proyecto/${m.proyecto_id}">${BC.esc(m.proyecto_nombre)}</a>
            <div class="pequeno tenue">${BC.esc(m.cliente_nombre)}</div></td>
        <td>${m.etapa === 'antes'
    ? '<span class="chip" style="border-color:rgba(217,89,38,.45);color:#f0a07c">Antes</span>'
    : '<span class="chip" style="border-color:rgba(25,158,112,.5);color:#6ee0b0">Después</span>'}</td>
        <td>${BC.fecha(m.fecha_muestreo)}</td>
        <td>${BC.esc(m.punto_codigo || '—')}</td>
        <td class="mono pequeno">${BC.esc(m.biocapsula_lote || '—')}</td>
        <td class="num">${m.total_resultados}</td>
        <td class="derecha" style="white-space:nowrap">
          <a class="btn btn-fantasma btn-sm" href="#/muestreo/${m.id}">Ver</a>
          <a class="btn btn-suave btn-sm" href="#/proyecto/${m.proyecto_id}/analisis">Comparar</a>
        </td>
      </tr>`).join('');
  }

  document.getElementById('f-proyecto').addEventListener('change', pintar);
  document.getElementById('f-etapa').addEventListener('change', pintar);
  document.getElementById('f-q').addEventListener('input', pintar);
  pintar();
};

/* ============ Formulario de registro de análisis (Módulos 7 y 8) ============ */

async function formularioMuestreo(contenedor, proyectoPreseleccionado) {
  if (!BC.sesion.puedeEditar()) {
    BC.app.cabecera('Registrar análisis', '');
    contenedor.innerHTML = BC.vacio('Su rol no permite registrar análisis de agua.', 'candado');
    return;
  }

  const [proyectos, parametros, lotes] = await Promise.all([
    BC.api('/proyectos'), BC.api('/muestreos/parametros'), BC.api('/biocapsulas'),
  ]);

  BC.app.cabecera(
    'Registrar análisis de agua',
    'Cada análisis corresponde a un muestreo: antes o después del tratamiento',
    '<a class="btn btn-fantasma btn-sm" href="#/analisis">← Volver al listado</a>',
  );

  contenedor.innerHTML = `
    <form id="form-muestreo">
      <section class="tarjeta">
        <div class="tarjeta-titulo"><h3>1 · Identificación del muestreo</h3></div>
        <div class="campos">
          <div class="campo">
            <label for="m-proyecto">Proyecto <span class="req">*</span></label>
            <select id="m-proyecto" name="proyecto_id" required>
              <option value="">— Seleccione —</option>
              ${proyectos.map((p) => `
                <option value="${p.id}"${String(p.id) === String(proyectoPreseleccionado) ? ' selected' : ''}>
                  ${BC.esc(p.nombre)} · ${BC.esc(p.cliente_nombre)}
                </option>`).join('')}
            </select>
          </div>

          <div class="campo">
            <label for="m-punto">Punto de muestreo</label>
            <select id="m-punto" name="punto_id"><option value="">— Seleccione el proyecto primero —</option></select>
          </div>

          <div class="campo">
            <label for="m-etapa">Etapa <span class="req">*</span></label>
            <select id="m-etapa" name="etapa" required>
              <option value="antes">Antes del tratamiento (afluente)</option>
              <option value="despues">Después del tratamiento (efluente)</option>
            </select>
          </div>

          <div class="campo">
            <label for="m-codigo">Código de la muestra</label>
            <input id="m-codigo" name="codigo" placeholder="Muestra 001">
            <div class="ayuda">Si lo deja vacío se numera automáticamente.</div>
          </div>

          <div class="campo">
            <label for="m-fecha">Fecha del muestreo <span class="req">*</span></label>
            <input id="m-fecha" name="fecha_muestreo" type="date" required value="${new Date().toISOString().slice(0, 10)}">
          </div>

          <div class="campo">
            <label for="m-hora">Hora</label>
            <input id="m-hora" name="hora" type="time">
          </div>

          <div class="campo">
            <label for="m-responsable">Responsable del muestreo</label>
            <input id="m-responsable" name="responsable" value="${BC.esc(BC.sesion.usuario.nombre)}">
          </div>

          <div class="campo">
            <label for="m-laboratorio">Laboratorio</label>
            <input id="m-laboratorio" name="laboratorio" placeholder="Laboratorio BioCaps · Santo Domingo">
          </div>
        </div>
      </section>

      <section class="tarjeta" style="margin-top:1.15rem">
        <div class="tarjeta-titulo">
          <h3>2 · Tratamiento aplicado</h3>
          <span class="chip">Sólo para muestras "después"</span>
        </div>
        <div class="campos">
          <div class="campo">
            <label for="m-lote">Lote de biocápsulas aplicado</label>
            <select id="m-lote" name="biocapsula_id">
              <option value="">— Ninguno —</option>
              ${lotes.map((l) => `
                <option value="${l.id}">
                  ${BC.esc(l.lote)} · ${BC.esc(l.consorcio_nombre || 'sin consorcio')} · ${l.vigencia}
                </option>`).join('')}
            </select>
          </div>
          <div class="campo">
            <label for="m-dosis">Dosis (número de cápsulas)</label>
            <input id="m-dosis" name="dosis_capsulas" type="number" min="0" step="1">
          </div>
          <div class="campo">
            <label for="m-retencion">Tiempo de retención hidráulica (h)</label>
            <input id="m-retencion" name="tiempo_retencion_h" type="number" min="0" step="any">
          </div>
        </div>
      </section>

      <section class="tarjeta" style="margin-top:1.15rem">
        <div class="tarjeta-titulo">
          <h3>3 · Parámetros fisicoquímicos y biológicos</h3>
          <span class="chip" id="chip-referencia">Sin muestra de referencia</span>
        </div>
        <div class="parametros-rejilla">
          ${parametros.map((p) => `
            <div class="parametro-campo">
              <label for="p-${p.codigo}">
                <span>${BC.esc(p.nombre)}</span>
                <span class="unidad">${BC.esc(p.unidad || '')}</span>
              </label>
              ${p.tipo === 'cualitativo'
    ? `<input id="p-${p.codigo}" data-parametro="${p.codigo}" placeholder="Ej.: inodoro, séptico…">`
    : `<input id="p-${p.codigo}" data-parametro="${p.codigo}" type="number" step="any" min="0" placeholder="0.00">`}
              <div class="semaforo-vivo" id="s-${p.codigo}"></div>
              <div class="limite">${BC.esc(textoLimite(p))}</div>
            </div>`).join('')}
        </div>
      </section>

      <section class="tarjeta" style="margin-top:1.15rem">
        <div class="tarjeta-titulo"><h3>4 · Observaciones</h3></div>
        <textarea name="observaciones" rows="3" placeholder="Condiciones del muestreo, aspecto de la muestra, incidencias…"></textarea>
      </section>

      <div class="fila-fin" style="margin-top:1.15rem">
        <a class="btn btn-fantasma" href="#/analisis">Cancelar</a>
        <button class="btn" type="submit" id="btn-guardar-m">Guardar análisis y calcular</button>
      </div>
    </form>`;

  const form = document.getElementById('form-muestreo');
  const selectProyecto = document.getElementById('m-proyecto');
  const selectPunto = document.getElementById('m-punto');
  const selectEtapa = document.getElementById('m-etapa');
  const chipReferencia = document.getElementById('chip-referencia');
  const porCodigo = Object.fromEntries(parametros.map((p) => [p.codigo, p]));

  let referencia = null; // muestreo de la etapa opuesta, para el % de remoción en vivo

  async function cargarPuntos() {
    const id = selectProyecto.value;
    if (!id) {
      selectPunto.innerHTML = '<option value="">— Seleccione el proyecto primero —</option>';
      return;
    }
    try {
      const puntos = await BC.api(`/proyectos/${id}/puntos`);
      selectPunto.innerHTML = `<option value="">— Sin punto asignado —</option>${
        puntos.map((pt) => `<option value="${pt.id}">${BC.esc(pt.codigo)} · ${BC.esc(pt.nombre || pt.tipo)}</option>`).join('')}`;

      // Sugerencia: entrada para "antes", salida para "después".
      const buscado = selectEtapa.value === 'antes' ? 'Entrada' : 'Salida';
      const sugerido = puntos.find((pt) => pt.tipo === buscado);
      if (sugerido) selectPunto.value = sugerido.id;
    } catch (e) { BC.error(e); }
  }

  async function cargarReferencia() {
    referencia = null;
    const id = selectProyecto.value;
    if (!id) {
      chipReferencia.textContent = 'Sin muestra de referencia';
      return actualizarSemaforos();
    }
    const etapaOpuesta = selectEtapa.value === 'antes' ? 'despues' : 'antes';
    try {
      const lista = await BC.api(`/muestreos?proyecto_id=${id}&etapa=${etapaOpuesta}`);
      if (!lista.length) {
        chipReferencia.textContent = `Sin muestra "${etapaOpuesta === 'antes' ? 'antes' : 'después'}" para comparar`;
        return actualizarSemaforos();
      }
      const detalle = await BC.api(`/muestreos/${lista[0].id}`);
      referencia = {
        etapa: etapaOpuesta,
        codigo: detalle.codigo,
        valores: Object.fromEntries(detalle.resultados.map((r) => [r.codigo, r.valor])),
      };
      chipReferencia.textContent = `Comparando contra ${detalle.codigo} (${etapaOpuesta === 'antes' ? 'antes' : 'después'})`;
    } catch {
      chipReferencia.textContent = 'Sin muestra de referencia';
    }
    actualizarSemaforos();
  }

  /** Semáforo y % de remoción en vivo, conforme se ingresan los valores. */
  function actualizarSemaforos() {
    for (const p of parametros) {
      const entrada = document.querySelector(`[data-parametro="${p.codigo}"]`);
      const destino = document.getElementById(`s-${p.codigo}`);
      const valor = entrada.value.trim();

      if (p.tipo === 'cualitativo') {
        destino.innerHTML = valor
          ? `<span class="chip">${BC.esc(valor)}</span>`
          : '';
        continue;
      }
      if (valor === '') { destino.innerHTML = ''; continue; }

      const nivel = clasificarLocal(p, valor);
      let extra = '';

      if (referencia && p.direccion === 'reducir') {
        const otro = referencia.valores[p.codigo];
        if (otro !== null && otro !== undefined && Number(otro) !== 0) {
          const inicial = referencia.etapa === 'antes' ? Number(otro) : Number(valor);
          const final = referencia.etapa === 'antes' ? Number(valor) : Number(otro);
          const reduccion = ((inicial - final) / inicial) * 100;
          const clase = reduccion > 0 ? 'delta-baja' : reduccion < 0 ? 'delta-sube' : 'delta-igual';
          extra = `<span class="celda-delta ${clase} pequeno" style="margin-left:.45rem">
                     ${reduccion > 0 ? '↓' : reduccion < 0 ? '↑' : '='} ${BC.pct(Math.abs(reduccion))}
                   </span>`;
        }
      }
      destino.innerHTML = BC.estado(nivel) + extra;
    }
  }

  selectProyecto.addEventListener('change', () => { cargarPuntos(); cargarReferencia(); });
  selectEtapa.addEventListener('change', () => { cargarPuntos(); cargarReferencia(); });
  for (const entrada of form.querySelectorAll('[data-parametro]')) {
    entrada.addEventListener('input', actualizarSemaforos);
  }

  if (proyectoPreseleccionado) { await cargarPuntos(); await cargarReferencia(); }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const boton = document.getElementById('btn-guardar-m');
    if (!BC.validarFormulario(form)) return;

    const resultados = {};
    let cuantos = 0;
    for (const entrada of form.querySelectorAll('[data-parametro]')) {
      const v = entrada.value.trim();
      if (v === '') continue;
      const p = porCodigo[entrada.dataset.parametro];
      resultados[p.codigo] = p.tipo === 'cualitativo' ? v : Number(v);
      cuantos++;
    }
    if (!cuantos) return BC.notificar('Ingrese al menos un parámetro medido.', 'error');

    const cuerpo = {
      proyecto_id: Number(selectProyecto.value),
      punto_id: selectPunto.value ? Number(selectPunto.value) : null,
      etapa: selectEtapa.value,
      codigo: form.codigo.value.trim() || null,
      fecha_muestreo: form.fecha_muestreo.value,
      hora: form.hora.value || null,
      responsable: form.responsable.value.trim() || null,
      laboratorio: form.laboratorio.value.trim() || null,
      biocapsula_id: form.biocapsula_id.value ? Number(form.biocapsula_id.value) : null,
      dosis_capsulas: form.dosis_capsulas.value ? Number(form.dosis_capsulas.value) : null,
      tiempo_retencion_h: form.tiempo_retencion_h.value ? Number(form.tiempo_retencion_h.value) : null,
      observaciones: form.observaciones.value.trim() || null,
      resultados,
    };

    boton.disabled = true;
    boton.textContent = 'Guardando y calculando…';
    try {
      const guardado = await BC.api('/muestreos', { method: 'POST', cuerpo });
      BC.exito(`${guardado.codigo} registrado con ${cuantos} parámetro(s). Indicadores actualizados.`);
      BC.app.actualizarContadores();
      location.hash = `#/proyecto/${cuerpo.proyecto_id}/analisis`;
    } catch (e) {
      BC.error(e);
      boton.disabled = false;
      boton.textContent = 'Guardar análisis y calcular';
    }
  });
}

/* ==================== Detalle de un muestreo ==================== */

BC.vistaMuestreoDetalle = async function vistaMuestreoDetalle(contenedor, parametros) {
  const id = Number(parametros[0]);
  const m = await BC.api(`/muestreos/${id}`);

  BC.app.cabecera(
    `${BC.esc(m.codigo)} · ${m.etapa === 'antes' ? 'antes' : 'después'} del tratamiento`,
    `${BC.esc(m.proyecto_nombre)} · ${BC.fecha(m.fecha_muestreo, true)}${m.hora ? ` · ${BC.esc(m.hora)}` : ''}`,
    `<a class="btn btn-suave btn-sm" href="#/proyecto/${m.proyecto_id}/analisis">Comparar antes/después</a>
     ${BC.sesion.puedeEditar() ? `<button class="btn btn-peligro btn-sm" id="btn-borrar-m" type="button">Eliminar</button>` : ''}`,
  );

  const conValor = m.resultados.filter((r) => r.valor !== null || r.valor_texto !== null);

  contenedor.innerHTML = `
    <div class="migas">
      <a href="#/proyectos">Proyectos</a> ›
      <a href="#/proyecto/${m.proyecto_id}">${BC.esc(m.proyecto_nombre)}</a> ›
      <span>${BC.esc(m.codigo)}</span>
    </div>

    <section class="rejilla rejilla-4">
      ${BC.indicador({
    etiqueta: 'Calidad de la muestra',
    valor: m.ica === null ? '—' : `${BC.num(m.ica, 0)}<small>/100</small>`,
    icono: 'gota', acento: m.calidad?.color || 'var(--brand)',
    estado: m.calidad,
  })}
      ${BC.indicador({
    etiqueta: 'Parámetros medidos', valor: conValor.length, icono: 'matraz',
    acento: 'var(--serie-3)', pie: `de ${m.resultados.length} disponibles`,
  })}
      ${BC.indicador({
    etiqueta: 'Cumplen la norma',
    valor: m.resultados.filter((r) => r.cumple === true).length,
    icono: 'balanza', acento: 'var(--estado-bueno)',
    pie: `${m.resultados.filter((r) => r.cumple === false).length} fuera de límite`,
  })}
      ${BC.indicador({
    etiqueta: 'Etapa', valor: m.etapa === 'antes' ? 'Antes' : 'Después', icono: m.etapa === 'antes' ? 'gota' : 'gota-check',
    acento: m.etapa === 'antes' ? 'var(--serie-1)' : 'var(--serie-2)',
    pie: BC.esc(m.punto_codigo ? `Punto ${m.punto_codigo}` : 'Sin punto asignado'),
  })}
    </section>

    <section class="rejilla" style="grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)">
      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>Resultados del análisis</h3>
          <button class="btn btn-fantasma btn-sm" id="btn-csv-m" type="button">${BC.icono('descargar', { tam: 14 })} CSV</button>
        </div>
        <div class="tabla-envoltura">
          <table class="tabla-parametros">
            <thead>
              <tr>
                <th>Parámetro</th><th class="num">Valor</th><th>Estado</th>
                <th>Límite de referencia</th><th>Cumple</th>
              </tr>
            </thead>
            <tbody>
              ${m.resultados.map((r) => `
                <tr>
                  <td>
                    <span class="simbolo">${BC.esc(r.simbolo || r.nombre)}</span>
                    <div class="pequeno tenue">${BC.esc(r.nombre)}</div>
                  </td>
                  <td class="num">
                    ${r.valor_texto
    ? BC.esc(r.valor_texto)
    : r.valor === null ? '<span class="tenue">—</span>'
      : `<strong>${r.codigo === 'coliformes_totales' ? BC.compacto(r.valor) : BC.num(r.valor, 2)}</strong>
                         <span class="unidad">${BC.esc(r.unidad || '')}</span>`}
                  </td>
                  <td>${BC.estado(r.nivel)}</td>
                  <td class="pequeno tenue">${BC.esc(r.normativa || '—')}</td>
                  <td>${r.cumple === null ? '<span class="tenue">n/a</span>'
    : r.cumple ? '<span class="estado estado-excelente">Sí</span>'
      : '<span class="estado estado-critico">No</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div class="tarjeta" style="margin-bottom:1.15rem">
          <div class="tarjeta-titulo"><h3>Datos del muestreo</h3></div>
          <div class="datos-lista">
            <div class="dato"><div class="dato-etiqueta">Punto</div><div class="dato-valor">${BC.esc(m.punto_codigo || '—')} ${BC.esc(m.punto_nombre || '')}</div></div>
            <div class="dato"><div class="dato-etiqueta">Tipo de punto</div><div class="dato-valor">${BC.esc(m.punto_tipo || '—')}</div></div>
            <div class="dato"><div class="dato-etiqueta">Responsable</div><div class="dato-valor">${BC.esc(m.responsable || '—')}</div></div>
            <div class="dato"><div class="dato-etiqueta">Laboratorio</div><div class="dato-valor">${BC.esc(m.laboratorio || '—')}</div></div>
            <div class="dato"><div class="dato-etiqueta">Registrado por</div><div class="dato-valor">${BC.esc(m.registrado_por || '—')}</div></div>
            <div class="dato"><div class="dato-etiqueta">Registrado el</div><div class="dato-valor">${BC.fechaHora(m.created_at)}</div></div>
          </div>
          ${m.observaciones ? `
            <div style="margin-top:.9rem">
              <div class="dato-etiqueta">Observaciones</div>
              <p class="pequeno" style="margin-top:.3rem">${BC.esc(m.observaciones)}</p>
            </div>` : ''}
        </div>

        ${m.biocapsula_lote ? `
          <div class="tarjeta">
            <div class="tarjeta-titulo"><h3>${BC.icono('capsula', { tam: 17, clase: 'icono-marca' })} Biocápsulas aplicadas</h3></div>
            <div class="datos-lista">
              <div class="dato"><div class="dato-etiqueta">Lote</div><div class="dato-valor mono">${BC.esc(m.biocapsula_lote)}</div></div>
              <div class="dato"><div class="dato-etiqueta">Consorcio</div><div class="dato-valor">${BC.esc(m.consorcio_nombre || '—')}</div></div>
              <div class="dato"><div class="dato-etiqueta">Concentración</div><div class="dato-valor">${BC.compacto(m.concentracion_ufc_ml)} UFC/mL</div></div>
              <div class="dato"><div class="dato-etiqueta">Diámetro</div><div class="dato-valor">${BC.num(m.diametro_mm, 1)} mm</div></div>
              <div class="dato"><div class="dato-etiqueta">Encapsulación</div><div class="dato-valor">${BC.fecha(m.fecha_encapsulacion)}</div></div>
              <div class="dato"><div class="dato-etiqueta">Vida útil</div><div class="dato-valor">${m.vida_util_dias ? `${m.vida_util_dias} días` : '—'}</div></div>
              <div class="dato"><div class="dato-etiqueta">Dosis aplicada</div><div class="dato-valor">${m.dosis_capsulas ? `${BC.num(m.dosis_capsulas, 0)} cápsulas` : '—'}</div></div>
              <div class="dato"><div class="dato-etiqueta">Retención</div><div class="dato-valor">${m.tiempo_retencion_h ? `${BC.num(m.tiempo_retencion_h, 1)} h` : '—'}</div></div>
            </div>
            ${m.consorcio_especies ? `<p class="pequeno tenue" style="margin:.8rem 0 0"><i>${BC.esc(m.consorcio_especies)}</i></p>` : ''}
          </div>` : ''}
      </div>
    </section>`;

  document.getElementById('btn-csv-m').addEventListener('click', () => {
    const filas = [['Parámetro', 'Símbolo', 'Valor', 'Unidad', 'Estado', 'Límite', 'Cumple']];
    for (const r of m.resultados) {
      filas.push([
        r.nombre, r.simbolo, r.valor_texto ?? r.valor ?? '', r.unidad,
        r.nivel.etiqueta, r.normativa, r.cumple === null ? 'n/a' : r.cumple ? 'Sí' : 'No',
      ]);
    }
    BC.descargar(BC.aCSV(filas), `${m.codigo.replace(/\s+/g, '-')}.csv`);
  });

  document.getElementById('btn-borrar-m')?.addEventListener('click', async () => {
    const ok = await BC.modal.confirmar({
      titulo: 'Eliminar análisis',
      mensaje: `¿Eliminar ${m.codigo} y todos sus resultados? Esta acción no se puede deshacer.`,
      textoAceptar: 'Eliminar', peligro: true,
    });
    if (!ok) return;
    try {
      await BC.api(`/muestreos/${m.id}`, { method: 'DELETE' });
      BC.exito('Análisis eliminado.');
      BC.app.actualizarContadores();
      location.hash = `#/proyecto/${m.proyecto_id}/muestreos`;
    } catch (e) { BC.error(e); }
  });
};

/* ============ Comparativa automática antes/después (Módulos 11 y 12) ============ */

BC.vistaComparar = async function vistaComparar(contenedor, parametros) {
  const id = Number(parametros[0]);
  if (!id) {
    const proyectos = await BC.api('/proyectos');
    BC.app.cabecera('Análisis comparativo', 'Seleccione un proyecto');
    contenedor.innerHTML = `
      <section class="rejilla rejilla-3">
        ${proyectos.map((p) => `
          <a class="tarjeta" href="#/proyecto/${p.id}/analisis" style="text-decoration:none">
            <h3>${BC.esc(p.nombre)}</h3>
            <p class="pequeno tenue">${BC.esc(p.cliente_nombre)} · ${p.total_muestreos} análisis</p>
          </a>`).join('')}
      </section>`;
    return;
  }
  BC.app.cabecera('Análisis comparativo', '');
  await BC.pintarComparativa(contenedor, id);
};

/**
 * Pinta el análisis comparativo completo de un proyecto.
 * Reutilizado por la pestaña del proyecto y por la vista independiente.
 */
BC.pintarComparativa = async function pintarComparativa(panel, proyectoId, seleccion = {}) {
  panel.innerHTML = BC.cargando('Calculando eficiencia del tratamiento…');

  const consulta = new URLSearchParams();
  if (seleccion.antes) consulta.set('antes', seleccion.antes);
  if (seleccion.despues) consulta.set('despues', seleccion.despues);
  const sufijo = consulta.toString() ? `?${consulta}` : '';

  const a = await BC.api(`/analisis/proyecto/${proyectoId}${sufijo}`);

  if (a.incompleto) {
    panel.innerHTML = `
      <div class="aviso aviso-alerta">
        <span class="aviso-icono">${BC.icono('alerta', { tam: 17 })}</span>
        <div class="aviso-cuerpo">
          <div class="aviso-titulo">Análisis comparativo incompleto</div>
          <div class="pequeno">${BC.esc(a.aviso)}</div>
        </div>
      </div>
      <div class="fila" style="margin-top:.5rem">
        ${BC.sesion.puedeEditar() ? `<a class="btn" href="#/analisis/nuevo/${proyectoId}">+ Registrar análisis</a>` : ''}
      </div>`;
    return;
  }

  const r = a.resumen;
  const antesMuestreos = a.disponibles.filter((m) => m.etapa === 'antes');
  const despuesMuestreos = a.disponibles.filter((m) => m.etapa === 'despues');

  // Barras: una sola unidad (mg/L) en un único eje.
  const barras = a.parametros
    .filter((p) => p.unidad === 'mg/L' && (p.valor_antes !== null || p.valor_despues !== null))
    .map((p) => ({
      etiqueta: p.simbolo, unidad: p.unidad, antes: p.valor_antes, despues: p.valor_despues,
      reduccion: p.reduccion, limite: p.limite_aceptable,
    }));

  const remocion = a.parametros
    .filter((p) => p.direccion === 'reducir' && p.reduccion !== null)
    .map((p) => ({ etiqueta: p.simbolo, reduccion: p.reduccion }))
    .sort((x, y) => y.reduccion - x.reduccion);

  // Radar: sub-índice de calidad 0–100 por parámetro. Acotado y comparable entre
  // unidades distintas, a diferencia del "% del límite" (los coliformes del
  // afluente representan miles de veces su límite y aplastarían los demás ejes).
  const radar = a.parametros
    .filter((p) => p.ica_antes !== null || p.ica_despues !== null)
    .map((p) => ({
      etiqueta: p.simbolo, antes: p.ica_antes, despues: p.ica_despues, reduccion: p.reduccion,
    }));

  panel.innerHTML = `
    <section class="filtros">
      <div class="campo">
        <label for="sel-antes">Muestra antes del tratamiento</label>
        <select id="sel-antes">
          ${antesMuestreos.map((m) => `
            <option value="${m.id}"${m.id === a.antes.id ? ' selected' : ''}>
              ${BC.esc(m.codigo)} · ${BC.fecha(m.fecha_muestreo)}
            </option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="sel-despues">Muestra después del tratamiento</label>
        <select id="sel-despues">
          ${despuesMuestreos.map((m) => `
            <option value="${m.id}"${m.id === a.despues.id ? ' selected' : ''}>
              ${BC.esc(m.codigo)} · ${BC.fecha(m.fecha_muestreo)}
            </option>`).join('')}
        </select>
      </div>
      <div class="filtros-acciones">
        <button class="btn btn-fantasma btn-sm" id="btn-csv-comp" type="button">${BC.icono('descargar', { tam: 14 })} CSV</button>
        ${BC.sesion.puedeEditar()
    ? `<button class="btn btn-sm" id="btn-reporte" type="button">${BC.icono('documento', { tam: 14 })} Generar reporte PDF</button>`
    : ''}
      </div>
    </section>

    <section class="rejilla rejilla-4">
      ${BC.indicador({
    etiqueta: 'Reducción promedio', valor: BC.num(r.reduccion_promedio, 1), unidad: '%',
    icono: 'tendencia-baja', acento: 'var(--serie-2)', pie: 'Parámetros clave reducibles',
  })}
      ${BC.indicador({
    etiqueta: 'Cumplimiento normativo', valor: BC.num(r.cumplimiento_pct, 0), unidad: '%',
    icono: 'balanza', acento: 'var(--serie-5)',
    pie: `${r.parametros_cumplen} de ${r.parametros_evaluados} parámetros`,
  })}
      ${BC.indicador({
    etiqueta: 'Calidad del agua',
    valor: `${BC.num(r.ica_antes, 0)} <span class="flecha-mejora">→</span> ${BC.num(r.ica_despues, 0)}<small>/100</small>`,
    compacto: true,
    icono: 'gota', acento: r.calidad_despues.color, estado: r.calidad_despues,
  })}
      ${BC.indicador({
    etiqueta: 'Semáforo del efluente',
    valor: `<span class="conteo-semaforo"><span class="punto-estado" style="--color-estado:var(--estado-bueno)"></span>${r.semaforo.excelente}<span class="punto-estado" style="--color-estado:var(--estado-aviso)"></span>${r.semaforo.aceptable}<span class="punto-estado" style="--color-estado:var(--estado-critico)"></span>${r.semaforo.critico}</span>`,
    compacto: true,
    icono: 'objetivo', acento: 'var(--serie-3)', pie: 'Excelente · aceptable · crítico',
  })}
    </section>

    <section class="rejilla rejilla-2">
      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>${BC.icono('cerebro', { tam: 17, clase: 'icono-marca' })} Interpretación automática</h3>
          <span class="chip">${a.inteligencia.length} hallazgo(s)</span>
        </div>
        ${a.inteligencia.map(BC.avisoInteligente).join('') || BC.vacio('Sin hallazgos.', 'cerebro')}
      </div>

      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Conclusión técnica</h3></div>
        <p class="pequeno">${BC.esc(a.interpretacion)}</p>
        <div class="aviso aviso-info" style="margin-bottom:0">
          <span class="aviso-icono">${BC.icono('objetivo', { tam: 17 })}</span>
          <div class="aviso-cuerpo">
            <div class="aviso-titulo">Conclusión</div>
            <div class="pequeno">${BC.esc(a.conclusion)}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="tarjeta">
      <div class="tarjeta-titulo">
        <h3>Tabla comparativa de parámetros</h3>
        <span class="chip">${BC.esc(a.antes.codigo)} → ${BC.esc(a.despues.codigo)}</span>
      </div>
      <div class="tabla-envoltura">
        <table class="tabla-parametros">
          <thead>
            <tr>
              <th>Parámetro</th>
              <th class="num">Antes</th>
              <th class="num">Después</th>
              <th class="num">Remoción</th>
              <th>Estado del efluente</th>
              <th>Límite</th>
              <th>Cumple</th>
            </tr>
          </thead>
          <tbody>
            ${a.parametros.map((p) => {
    const fmt = (v, texto) => {
      if (texto) return BC.esc(texto);
      if (v === null) return '<span class="tenue">—</span>';
      return p.codigo === 'coliformes_totales' ? BC.compacto(v) : BC.num(v, 2);
    };
    const clase = p.reduccion === null ? 'delta-igual' : p.reduccion > 0 ? 'delta-baja' : p.reduccion < 0 ? 'delta-sube' : 'delta-igual';
    return `
              <tr>
                <td>
                  <span class="simbolo">${BC.esc(p.simbolo)}</span>
                  <div class="pequeno tenue">${BC.esc(p.nombre)} ${p.unidad ? `(${BC.esc(p.unidad)})` : ''}</div>
                </td>
                <td class="num">${fmt(p.valor_antes, p.texto_antes)}</td>
                <td class="num"><strong>${fmt(p.valor_despues, p.texto_despues)}</strong></td>
                <td class="num">
                  ${p.reduccion === null ? '<span class="tenue">—</span>'
    : `<span class="celda-delta ${clase}">${p.reduccion > 0 ? '↓' : p.reduccion < 0 ? '↑' : '='} ${BC.pct(Math.abs(p.reduccion))}</span>`}
                </td>
                <td>${BC.estado(p.nivel_despues)}</td>
                <td class="pequeno tenue">${BC.esc(p.normativa || '—')}</td>
                <td>${p.cumple_despues === null ? '<span class="tenue">n/a</span>'
    : p.cumple_despues ? '<span class="estado estado-excelente">Sí</span>'
      : '<span class="estado estado-critico">No</span>'}</td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="rejilla rejilla-2">
      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>Antes vs Después</h3><span class="chip">mg/L</span>
        </div>
        ${barras.length
    ? '<div class="grafico-caja grafico-alto-2"><canvas id="c-barras"></canvas></div>'
    : BC.vacio('Sin parámetros en mg/L medidos.', 'grafico-barras')}
      </div>

      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>Remoción por parámetro</h3><span class="chip">%</span>
        </div>
        ${remocion.length
    ? '<div class="grafico-caja grafico-alto-2"><canvas id="c-remocion"></canvas></div>'
    : BC.vacio('Sin remociones calculables.', 'tendencia-baja')}
      </div>
    </section>

    <section class="rejilla rejilla-2">
      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>Calidad por parámetro</h3><span class="chip">Sub-índice · 100 = óptimo</span>
        </div>
        ${radar.length
    ? '<div class="grafico-caja grafico-alto-2"><canvas id="c-radar"></canvas></div>'
    : BC.vacio('Sin datos para el radar.', 'radar')}
      </div>

      <div class="tarjeta">
        <div class="tarjeta-titulo">
          <h3>Evolución mensual del proyecto</h3><span class="chip">mg/L</span>
        </div>
        <div class="grafico-caja grafico-alto-2"><canvas id="c-evolucion"></canvas></div>
      </div>
    </section>

    <section class="rejilla rejilla-2">
      ${[['antes', a.antes, `${BC.icono('gota', { tam: 16 })} Muestra antes del tratamiento`],
      ['despues', a.despues, `${BC.icono('gota-check', { tam: 16 })} Muestra después del tratamiento`]]
    .map(([, m, titulo]) => `
        <div class="tarjeta">
          <div class="tarjeta-titulo"><h3>${titulo}</h3></div>
          <div class="datos-lista">
            <div class="dato"><div class="dato-etiqueta">Código</div><div class="dato-valor">${BC.esc(m.codigo)}</div></div>
            <div class="dato"><div class="dato-etiqueta">Fecha</div><div class="dato-valor">${BC.fecha(m.fecha_muestreo, true)}</div></div>
            <div class="dato"><div class="dato-etiqueta">Punto</div><div class="dato-valor">${BC.esc(m.punto_codigo || '—')}</div></div>
            <div class="dato"><div class="dato-etiqueta">Responsable</div><div class="dato-valor">${BC.esc(m.responsable || '—')}</div></div>
            ${m.biocapsula_lote ? `
              <div class="dato"><div class="dato-etiqueta">Lote aplicado</div><div class="dato-valor mono">${BC.esc(m.biocapsula_lote)}</div></div>
              <div class="dato"><div class="dato-etiqueta">Consorcio</div><div class="dato-valor">${BC.esc(m.consorcio_nombre || '—')}</div></div>
              <div class="dato"><div class="dato-etiqueta">Dosis</div><div class="dato-valor">${m.dosis_capsulas ? `${BC.num(m.dosis_capsulas, 0)} cápsulas` : '—'}</div></div>
              <div class="dato"><div class="dato-etiqueta">Retención</div><div class="dato-valor">${m.tiempo_retencion_h ? `${BC.num(m.tiempo_retencion_h, 1)} h` : '—'}</div></div>` : ''}
          </div>
          ${m.punto_fotografia
    ? `<img class="miniatura" src="${BC.esc(m.punto_fotografia)}" alt="Fotografía del punto de muestreo" style="margin-top:.85rem;max-width:280px">`
    : ''}
          ${m.observaciones ? `<p class="pequeno tenue" style="margin:.8rem 0 0">${BC.esc(m.observaciones)}</p>` : ''}
        </div>`).join('')}
    </section>`;

  /* ------------------------------ Gráficos ------------------------------ */

  if (barras.length) BC.graficos.barrasAntesDespues('c-barras', barras);
  if (remocion.length) BC.graficos.barrasRemocion('c-remocion', remocion);
  if (radar.length) BC.graficos.radarParametros('c-radar', radar);

  try {
    const codigosEvolucion = ['nh4_n', 'dbo5', 'dqo'];
    const ev = await BC.api(`/analisis/proyecto/${proyectoId}/evolucion?parametros=${codigosEvolucion.join(',')}`);
    if (ev.meses.length) {
      // El color identifica al parámetro; el trazo discontinuo distingue el afluente
      // del efluente. Así el color sigue a la entidad y no a su posición en la lista.
      BC.graficos.lineasEvolucion('c-evolucion', {
        etiquetas: ev.meses.map(BC.mesNombre),
        series: ev.series.map((s) => ({
          etiqueta: s.etiqueta,
          datos: s.datos,
          discontinua: s.etapa === 'antes',
          color: BC.graficos.colorParametro(s.codigo),
        })),
      });
    }
  } catch { /* la evolución es complementaria */ }

  /* ------------------------------ Acciones ------------------------------ */

  const recargar = () => BC.pintarComparativa(panel, proyectoId, {
    antes: document.getElementById('sel-antes').value,
    despues: document.getElementById('sel-despues').value,
  });
  document.getElementById('sel-antes').addEventListener('change', recargar);
  document.getElementById('sel-despues').addEventListener('change', recargar);

  document.getElementById('btn-csv-comp').addEventListener('click', () => {
    const filas = [['Parámetro', 'Símbolo', 'Unidad', 'Antes', 'Después', 'Remoción %', 'Estado', 'Límite', 'Cumple']];
    for (const p of a.parametros) {
      filas.push([
        p.nombre, p.simbolo, p.unidad,
        p.valor_antes ?? p.texto_antes ?? '', p.valor_despues ?? p.texto_despues ?? '',
        p.reduccion === null ? '' : p.reduccion.toFixed(2),
        p.nivel_despues.etiqueta, p.normativa,
        p.cumple_despues === null ? 'n/a' : p.cumple_despues ? 'Sí' : 'No',
      ]);
    }
    BC.descargar(BC.aCSV(filas), `comparativa-${a.proyecto.codigo || proyectoId}.csv`);
  });

  document.getElementById('btn-reporte')?.addEventListener('click', () => {
    BC.reportes.generar({
      proyecto_id: proyectoId,
      muestreo_antes_id: a.antes.id,
      muestreo_despues_id: a.despues.id,
      graficos: {
        barras: BC.graficos.imagen('c-barras'),
        remocion: BC.graficos.imagen('c-remocion'),
        radar: BC.graficos.imagen('c-radar'),
        evolucion: BC.graficos.imagen('c-evolucion'),
      },
    });
  });
};
