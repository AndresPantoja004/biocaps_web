/* ============================================================================
   BioCaps Monitor®
   Módulo 9  — Consorcios bacterianos (parámetros biológicos del tratamiento)
   Módulo 10 — Datos de las biocápsulas
   Módulo 12 — Configuración de los límites del semáforo
   ========================================================================= */

/* ---------------------------- Biocápsulas ---------------------------- */

async function modalLote(lote = null) {
  const consorcios = await BC.api('/biocapsulas/consorcios');
  const esNuevo = !lote;

  const campos = [
    { nombre: 'lote', etiqueta: 'Número de lote', requerido: true, ayuda: 'Ej.: BC-2026-007' },
    {
      nombre: 'consorcio_id', etiqueta: 'Consorcio bacteriano', tipo: 'select',
      opciones: consorcios.map((c) => ({ valor: c.id, texto: c.nombre })),
    },
    { tipo: 'separador', etiqueta: 'Encapsulación' },
    { nombre: 'fecha_encapsulacion', etiqueta: 'Fecha de encapsulación', tipo: 'date' },
    { nombre: 'vida_util_dias', etiqueta: 'Vida útil (días)', tipo: 'number', min: 0, paso: 1 },
    { nombre: 'alginato_sodio_pct', etiqueta: 'Alginato de sodio (%)', tipo: 'number', paso: 'any', min: 0 },
    { nombre: 'cacl2_pct', etiqueta: 'CaCl₂ (%)', tipo: 'number', paso: 'any', min: 0 },
    { tipo: 'separador', etiqueta: 'Características físicas y biológicas' },
    { nombre: 'diametro_mm', etiqueta: 'Diámetro (mm)', tipo: 'number', paso: 'any', min: 0 },
    { nombre: 'numero_capsulas', etiqueta: 'Número de cápsulas', tipo: 'number', paso: 1, min: 0 },
    { nombre: 'peso_g', etiqueta: 'Peso total (g)', tipo: 'number', paso: 'any', min: 0 },
    {
      nombre: 'concentracion_ufc_ml', etiqueta: 'Concentración bacteriana (UFC/mL)',
      tipo: 'number', paso: 'any', min: 0, ayuda: 'Ej.: 1200000000 para 1,2 × 10⁹',
    },
    { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo' },
  ];

  BC.modal.abrir({
    titulo: esNuevo ? 'Registrar lote de biocápsulas' : `Editar lote ${lote.lote}`,
    cuerpo: BC.formulario(campos, lote || {}),
    acciones: [
      { texto: 'Cancelar', al: ({ cerrar }) => cerrar() },
      {
        texto: esNuevo ? 'Registrar lote' : 'Guardar cambios',
        clase: 'btn',
        al: async ({ cerrar, modal, boton }) => {
          const form = modal.querySelector('form');
          if (!BC.validarFormulario(form)) return;
          boton.disabled = true;
          try {
            const datos = BC.leerFormulario(form);
            if (esNuevo) await BC.api('/biocapsulas', { method: 'POST', cuerpo: datos });
            else await BC.api(`/biocapsulas/${lote.id}`, { method: 'PUT', cuerpo: datos });
            BC.exito(esNuevo ? 'Lote registrado.' : 'Lote actualizado.');
            cerrar();
            await BC.app.enrutar();
            BC.app.actualizarContadores();
          } catch (e) {
            BC.error(e);
            boton.disabled = false;
          }
        },
      },
    ],
  });
}

BC.vistaBiocapsulas = async function vistaBiocapsulas(contenedor) {
  const lotes = await BC.api('/biocapsulas');
  const puedeEditar = BC.sesion.puedeEditar();

  const vigentes = lotes.filter((l) => l.vigencia === 'Vigente').length;
  const porCaducar = lotes.filter((l) => l.vigencia === 'Por caducar').length;
  const caducados = lotes.filter((l) => l.vigencia === 'Caducado').length;
  const capsulas = lotes.reduce((s, l) => s + (l.numero_capsulas || 0), 0);

  BC.app.cabecera(
    'Biocápsulas',
    `${lotes.length} lote(s) de encapsulación registrados`,
    `${puedeEditar ? `<button class="btn btn-sm" id="btn-nuevo-lote" type="button">${BC.icono('mas', { tam: 14 })} Registrar lote</button>` : ''}`,
  );

  contenedor.innerHTML = `
    <section class="rejilla rejilla-4">
      ${BC.indicador({ etiqueta: 'Lotes vigentes', valor: vigentes, icono: 'capsula', acento: 'var(--estado-bueno)' })}
      ${BC.indicador({ etiqueta: 'Por caducar (≤ 15 días)', valor: porCaducar, icono: 'reloj-arena', acento: 'var(--estado-aviso)' })}
      ${BC.indicador({ etiqueta: 'Caducados', valor: caducados, icono: 'alerta', acento: 'var(--estado-critico)' })}
      ${BC.indicador({ etiqueta: 'Cápsulas producidas', valor: BC.num(capsulas, 0), icono: 'semilla', acento: 'var(--serie-3)' })}
    </section>

    ${porCaducar || caducados ? `
      <div class="aviso aviso-alerta">
        <span class="aviso-icono">${BC.icono('alerta', { tam: 17 })}</span>
        <div class="aviso-cuerpo">
          <div class="aviso-titulo">Atención a la vida útil de los lotes</div>
          <div class="pequeno">
            ${caducados ? `${caducados} lote(s) caducado(s) no deben aplicarse. ` : ''}
            ${porCaducar ? `${porCaducar} lote(s) caducan en 15 días o menos: planifique el recambio.` : ''}
          </div>
        </div>
      </div>` : ''}

    <section class="tarjeta">
      <div class="tarjeta-titulo">
        <h3>Lotes de encapsulación</h3>
        <button class="btn btn-fantasma btn-sm" id="btn-csv-lotes" type="button">${BC.icono('descargar', { tam: 14 })} CSV</button>
      </div>

      ${lotes.length ? `
        <div class="rejilla rejilla-3">
          ${lotes.map((l) => `
            <article class="panel">
              <div class="entre" style="margin-bottom:.75rem">
                <div>
                  <h3 style="margin:0;font-size:1.02rem" class="mono">${BC.esc(l.lote)}</h3>
                  <div class="pequeno tenue">${BC.esc(l.consorcio_nombre || 'Sin consorcio asignado')}</div>
                </div>
                <span class="estado estado-${l.vigencia === 'Vigente' ? 'excelente' : l.vigencia === 'Por caducar' ? 'aceptable' : 'critico'}">
                  ${BC.esc(l.vigencia)}
                </span>
              </div>

              <div class="datos-lista">
                <div class="dato"><div class="dato-etiqueta">Encapsulación</div><div class="dato-valor">${BC.fecha(l.fecha_encapsulacion)}</div></div>
                <div class="dato"><div class="dato-etiqueta">Caduca</div><div class="dato-valor">${BC.fecha(l.fecha_caducidad)}</div></div>
                <div class="dato"><div class="dato-etiqueta">Vida útil</div><div class="dato-valor">${l.vida_util_dias ? `${l.vida_util_dias} días` : '—'}</div></div>
                <div class="dato"><div class="dato-etiqueta">Días restantes</div><div class="dato-valor">${l.dias_restantes === null ? '—' : l.dias_restantes}</div></div>
                <div class="dato"><div class="dato-etiqueta">Alginato de sodio</div><div class="dato-valor">${l.alginato_sodio_pct ? `${BC.num(l.alginato_sodio_pct, 1)} %` : '—'}</div></div>
                <div class="dato"><div class="dato-etiqueta">CaCl₂</div><div class="dato-valor">${l.cacl2_pct ? `${BC.num(l.cacl2_pct, 1)} %` : '—'}</div></div>
                <div class="dato"><div class="dato-etiqueta">Diámetro</div><div class="dato-valor">${l.diametro_mm ? `${BC.num(l.diametro_mm, 1)} mm` : '—'}</div></div>
                <div class="dato"><div class="dato-etiqueta">N.º de cápsulas</div><div class="dato-valor">${BC.num(l.numero_capsulas, 0)}</div></div>
                <div class="dato"><div class="dato-etiqueta">Peso</div><div class="dato-valor">${l.peso_g ? `${BC.num(l.peso_g, 1)} g` : '—'}</div></div>
                <div class="dato"><div class="dato-etiqueta">Concentración</div><div class="dato-valor">${BC.compacto(l.concentracion_ufc_ml)} UFC/mL</div></div>
                <div class="dato"><div class="dato-etiqueta">Aplicaciones</div><div class="dato-valor">${l.aplicaciones}</div></div>
              </div>

              ${l.observaciones ? `<p class="pequeno tenue" style="margin:.75rem 0 0">${BC.esc(l.observaciones)}</p>` : ''}

              ${puedeEditar ? `
                <div class="fila" style="margin-top:.85rem">
                  <button class="btn btn-fantasma btn-sm" data-editar-l="${l.id}" type="button">Editar</button>
                  <button class="btn btn-peligro btn-sm" data-borrar-l="${l.id}" type="button">Eliminar</button>
                </div>` : ''}
            </article>`).join('')}
        </div>` : BC.vacio('Todavía no hay lotes de biocápsulas registrados.', 'capsula')}
    </section>`;

  document.getElementById('btn-nuevo-lote')?.addEventListener('click', () => modalLote());
  for (const btn of contenedor.querySelectorAll('[data-editar-l]')) {
    btn.addEventListener('click', () => modalLote(lotes.find((l) => l.id === Number(btn.dataset.editarL))));
  }
  for (const btn of contenedor.querySelectorAll('[data-borrar-l]')) {
    btn.addEventListener('click', async () => {
      const lote = lotes.find((l) => l.id === Number(btn.dataset.borrarL));
      const ok = await BC.modal.confirmar({
        titulo: 'Eliminar lote',
        mensaje: `¿Eliminar el lote ${lote.lote}? Los muestreos que lo referencian quedarán sin lote asignado.`,
        textoAceptar: 'Eliminar', peligro: true,
      });
      if (!ok) return;
      try {
        await BC.api(`/biocapsulas/${lote.id}`, { method: 'DELETE' });
        BC.exito('Lote eliminado.');
        await BC.app.enrutar();
      } catch (e) { BC.error(e); }
    });
  }
  document.getElementById('btn-csv-lotes').addEventListener('click', () => {
    const filas = [['Lote', 'Consorcio', 'Encapsulación', 'Caducidad', 'Vida útil (días)', 'Alginato %', 'CaCl2 %',
      'Diámetro mm', 'N.º cápsulas', 'Peso g', 'UFC/mL', 'Vigencia', 'Aplicaciones']];
    for (const l of lotes) {
      filas.push([l.lote, l.consorcio_nombre, l.fecha_encapsulacion, l.fecha_caducidad, l.vida_util_dias,
        l.alginato_sodio_pct, l.cacl2_pct, l.diametro_mm, l.numero_capsulas, l.peso_g,
        l.concentracion_ufc_ml, l.vigencia, l.aplicaciones]);
    }
    BC.descargar(BC.aCSV(filas), 'biocaps-lotes.csv');
  });
};

/* ---------------------------- Consorcios ---------------------------- */

function modalConsorcio(consorcio = null) {
  const esNuevo = !consorcio;
  const campos = [
    { nombre: 'nombre', etiqueta: 'Nombre del consorcio', requerido: true, ancho: 'completo' },
    { nombre: 'especies', etiqueta: 'Especies bacterianas', tipo: 'textarea', ancho: 'completo',
      ayuda: 'Separadas por coma. Ej.: Nitrosomonas europaea, Nitrobacter winogradskyi' },
    { nombre: 'concentracion_ufc_ml', etiqueta: 'Concentración (UFC/mL)', tipo: 'number', paso: 'any', min: 0 },
    { nombre: 'funcion', etiqueta: 'Función en el tratamiento' },
    { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', ancho: 'completo' },
  ];

  BC.modal.abrir({
    titulo: esNuevo ? 'Registrar consorcio bacteriano' : `Editar: ${consorcio.nombre}`,
    cuerpo: BC.formulario(campos, consorcio || {}),
    acciones: [
      { texto: 'Cancelar', al: ({ cerrar }) => cerrar() },
      {
        texto: esNuevo ? 'Registrar consorcio' : 'Guardar cambios',
        clase: 'btn',
        al: async ({ cerrar, modal, boton }) => {
          const form = modal.querySelector('form');
          if (!BC.validarFormulario(form)) return;
          boton.disabled = true;
          try {
            const datos = BC.leerFormulario(form);
            if (esNuevo) await BC.api('/biocapsulas/consorcios', { method: 'POST', cuerpo: datos });
            else await BC.api(`/biocapsulas/consorcios/${consorcio.id}`, { method: 'PUT', cuerpo: datos });
            BC.exito(esNuevo ? 'Consorcio registrado.' : 'Consorcio actualizado.');
            cerrar();
            await BC.app.enrutar();
          } catch (e) {
            BC.error(e);
            boton.disabled = false;
          }
        },
      },
    ],
  });
}

BC.vistaConsorcios = async function vistaConsorcios(contenedor) {
  const consorcios = await BC.api('/biocapsulas/consorcios');
  const puedeEditar = BC.sesion.puedeEditar();

  BC.app.cabecera(
    'Consorcios bacterianos',
    `${consorcios.length} consorcio(s) · parámetros biológicos del tratamiento`,
    `${puedeEditar ? `<button class="btn btn-sm" id="btn-nuevo-consorcio" type="button">${BC.icono('mas', { tam: 14 })} Registrar consorcio</button>` : ''}`,
  );

  contenedor.innerHTML = `
    <section class="rejilla rejilla-2">
      ${consorcios.length ? consorcios.map((c) => `
        <article class="tarjeta">
          <div class="tarjeta-titulo">
            <h3>${BC.icono('microbio', { tam: 17, clase: 'icono-marca' })} ${BC.esc(c.nombre)}</h3>
            <span class="chip">${c.total_lotes} lote(s)</span>
          </div>
          ${c.funcion ? `<p class="pequeno"><b>Función:</b> ${BC.esc(c.funcion)}</p>` : ''}
          ${c.especies ? `
            <div style="margin-bottom:.7rem">
              <div class="dato-etiqueta">Especies</div>
              <p class="pequeno" style="margin:.25rem 0 0"><i>${BC.esc(c.especies)}</i></p>
            </div>` : ''}
          <div class="datos-lista">
            <div class="dato">
              <div class="dato-etiqueta">Concentración</div>
              <div class="dato-valor">${BC.compacto(c.concentracion_ufc_ml)} UFC/mL</div>
            </div>
            <div class="dato">
              <div class="dato-etiqueta">Lotes producidos</div>
              <div class="dato-valor">${c.total_lotes}</div>
            </div>
          </div>
          ${c.descripcion ? `<p class="pequeno tenue" style="margin:.75rem 0 0">${BC.esc(c.descripcion)}</p>` : ''}
          ${puedeEditar ? `
            <div class="fila" style="margin-top:.9rem">
              <button class="btn btn-fantasma btn-sm" data-editar-c="${c.id}" type="button">Editar</button>
              <button class="btn btn-peligro btn-sm" data-borrar-c="${c.id}" type="button">Eliminar</button>
            </div>` : ''}
        </article>`).join('') : BC.vacio('Todavía no hay consorcios registrados.', 'microbio')}
    </section>`;

  document.getElementById('btn-nuevo-consorcio')?.addEventListener('click', () => modalConsorcio());
  for (const btn of contenedor.querySelectorAll('[data-editar-c]')) {
    btn.addEventListener('click', () => modalConsorcio(consorcios.find((c) => c.id === Number(btn.dataset.editarC))));
  }
  for (const btn of contenedor.querySelectorAll('[data-borrar-c]')) {
    btn.addEventListener('click', async () => {
      const c = consorcios.find((x) => x.id === Number(btn.dataset.borrarC));
      const ok = await BC.modal.confirmar({
        titulo: 'Eliminar consorcio',
        mensaje: `¿Eliminar "${c.nombre}"? Los lotes asociados quedarán sin consorcio.`,
        textoAceptar: 'Eliminar', peligro: true,
      });
      if (!ok) return;
      try {
        await BC.api(`/biocapsulas/consorcios/${c.id}`, { method: 'DELETE' });
        BC.exito('Consorcio eliminado.');
        await BC.app.enrutar();
      } catch (e) { BC.error(e); }
    });
  }
};

/* ------------- Límites configurables del semáforo (Módulo 12) ------------- */

BC.vistaParametros = async function vistaParametros(contenedor) {
  if (!BC.sesion.esAdmin()) {
    BC.app.cabecera('Límites y parámetros', '');
    contenedor.innerHTML = BC.vacio('Sólo el administrador puede configurar los límites del semáforo.', 'candado');
    return;
  }

  const parametros = await BC.api('/muestreos/parametros');

  BC.app.cabecera(
    'Límites y parámetros',
    'Umbrales configurables que alimentan el semáforo: Excelente · Aceptable · Crítico',
  );

  contenedor.innerHTML = `
    <div class="aviso aviso-info">
      <span class="aviso-icono">${BC.icono('info', { tam: 17 })}</span>
      <div class="aviso-cuerpo">
        <div class="aviso-titulo">Cómo se clasifica cada parámetro</div>
        <div class="pequeno">
          <b>Reducir</b> (DBO₅, DQO, NH₄⁺-N…): excelente si el valor ≤ umbral excelente, aceptable si ≤ límite permisible, crítico si lo supera. ·
          <b>Aumentar</b> (oxígeno disuelto): excelente si ≥ umbral excelente. ·
          <b>Rango</b> (pH, temperatura): excelente dentro del rango ideal, aceptable dentro del permisible.
          Los valores por defecto provienen del TULSMA — Acuerdo Ministerial 097-A, Anexo 1, Tabla 9.
        </div>
      </div>
    </div>

    <section class="tarjeta">
      <div class="tarjeta-titulo">
        <h3>Catálogo de parámetros (Módulo 8)</h3>
        <span class="chip">${parametros.length} parámetros</span>
      </div>
      <div class="tabla-envoltura">
        <table class="tabla-parametros">
          <thead>
            <tr>
              <th>Parámetro</th><th>Unidad</th><th>Criterio</th>
              <th class="num">Excelente</th><th class="num">Aceptable / límite</th>
              <th class="num">Rango ideal</th><th class="num">Rango permisible</th>
              <th>Clave</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${parametros.map((p) => `
              <tr>
                <td>
                  <span class="simbolo">${BC.esc(p.simbolo || p.nombre)}</span>
                  <div class="pequeno tenue">${BC.esc(p.nombre)}</div>
                </td>
                <td class="pequeno">${BC.esc(p.unidad || '—')}</td>
                <td><span class="chip">${BC.esc(p.direccion)}</span></td>
                <td class="num">${p.limite_excelente ?? '—'}</td>
                <td class="num">${p.limite_aceptable ?? '—'}</td>
                <td class="num pequeno">${p.rango_ideal_min !== null ? `${p.rango_ideal_min} – ${p.rango_ideal_max}` : '—'}</td>
                <td class="num pequeno">${p.rango_min !== null ? `${p.rango_min} – ${p.rango_max}` : '—'}</td>
                <td>${p.clave ? '<span class="chip chip-marca">Sí</span>' : '<span class="tenue pequeno">No</span>'}</td>
                <td class="derecha">
                  ${p.tipo === 'cualitativo' ? '' : `<button class="btn btn-fantasma btn-sm" data-editar-par="${p.codigo}" type="button">Configurar</button>`}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;

  for (const btn of contenedor.querySelectorAll('[data-editar-par]')) {
    btn.addEventListener('click', () => {
      const p = parametros.find((x) => x.codigo === btn.dataset.editarPar);
      const esRango = p.direccion === 'rango';

      const campos = esRango
        ? [
          { nombre: 'rango_ideal_min', etiqueta: 'Rango ideal — mínimo', tipo: 'number', paso: 'any' },
          { nombre: 'rango_ideal_max', etiqueta: 'Rango ideal — máximo', tipo: 'number', paso: 'any' },
          { nombre: 'rango_min', etiqueta: 'Rango permisible — mínimo', tipo: 'number', paso: 'any' },
          { nombre: 'rango_max', etiqueta: 'Rango permisible — máximo', tipo: 'number', paso: 'any' },
          { nombre: 'normativa', etiqueta: 'Texto de la normativa', ancho: 'completo' },
        ]
        : [
          {
            nombre: 'limite_excelente',
            etiqueta: `Umbral excelente (${p.direccion === 'aumentar' ? '≥' : '≤'})`,
            tipo: 'number', paso: 'any',
          },
          {
            nombre: 'limite_aceptable',
            etiqueta: `Límite permisible (${p.direccion === 'aumentar' ? '≥' : '≤'})`,
            tipo: 'number', paso: 'any',
          },
          { nombre: 'normativa', etiqueta: 'Texto de la normativa', ancho: 'completo' },
        ];

      BC.modal.abrir({
        titulo: `Configurar ${p.nombre}`,
        ancho: '560px',
        cuerpo: `
          <p class="pequeno tenue">Unidad: <b>${BC.esc(p.unidad || '—')}</b> · criterio: <b>${BC.esc(p.direccion)}</b></p>
          ${BC.formulario(campos, p)}
          <label style="margin-top:.9rem;display:flex;gap:.5rem;align-items:center">
            <input type="checkbox" id="par-clave" ${p.clave ? 'checked' : ''} style="width:auto">
            <span>Incluir entre los parámetros clave del dashboard y del promedio de remoción</span>
          </label>`,
        acciones: [
          { texto: 'Cancelar', al: ({ cerrar }) => cerrar() },
          {
            texto: 'Guardar límites',
            clase: 'btn',
            al: async ({ cerrar, modal, boton }) => {
              boton.disabled = true;
              try {
                const datos = BC.leerFormulario(modal.querySelector('form'));
                datos.clave = modal.querySelector('#par-clave').checked;
                await BC.api(`/muestreos/parametros/${p.codigo}`, { method: 'PUT', cuerpo: datos });
                BC.exito('Límites actualizados. Los indicadores se recalcularán automáticamente.');
                cerrar();
                await BC.app.enrutar();
              } catch (e) {
                BC.error(e);
                boton.disabled = false;
              }
            },
          },
        ],
      });
    });
  }
};
