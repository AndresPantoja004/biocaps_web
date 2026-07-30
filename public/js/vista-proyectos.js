/* ============================================================================
   BioCaps Monitor® — Módulo 5: Proyectos  ·  Módulo 6: Puntos de muestreo
   ========================================================================= */

const TIPOS_AGUA = ['Doméstica', 'Industrial', 'Agrícola', 'Lixiviados'];
const ESTADOS_PROYECTO = ['Planificado', 'Activo', 'Finalizado', 'Suspendido'];
const TIPOS_PUNTO = ['Entrada', 'Intermedio', 'Salida', 'Cuerpo receptor'];

/* ------------------------------ Formularios ------------------------------ */

async function modalProyecto(proyecto = null) {
  const clientes = await BC.api('/clientes');
  const esNuevo = !proyecto;

  const campos = [
    { nombre: 'nombre', etiqueta: 'Nombre del proyecto', requerido: true, ancho: 'completo' },
    {
      nombre: 'cliente_id', etiqueta: 'Cliente', tipo: 'select', requerido: true,
      opciones: clientes.map((c) => ({ valor: c.id, texto: `${c.nombre} (${c.tipo})` })),
    },
    { nombre: 'codigo', etiqueta: 'Código', ayuda: 'Si lo deja vacío se genera automáticamente (PRY-00N).' },
    {
      nombre: 'tipo_agua', etiqueta: 'Tipo de agua', tipo: 'select', requerido: true,
      opciones: TIPOS_AGUA,
    },
    { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: ESTADOS_PROYECTO, valor: 'Activo', vacio: false },
    { nombre: 'ubicacion', etiqueta: 'Ubicación', ancho: 'completo' },
    { nombre: 'latitud', etiqueta: 'Latitud', tipo: 'number', paso: 'any', ayuda: 'Ej.: -0.2542' },
    { nombre: 'longitud', etiqueta: 'Longitud', tipo: 'number', paso: 'any', ayuda: 'Ej.: -79.1750' },
    { nombre: 'caudal_m3_dia', etiqueta: 'Caudal (m³/día)', tipo: 'number', paso: 'any', min: 0 },
    { nombre: 'fecha_inicio', etiqueta: 'Fecha de inicio', tipo: 'date' },
    { nombre: 'fecha_fin', etiqueta: 'Fecha de fin', tipo: 'date' },
    { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', ancho: 'completo' },
  ];

  BC.modal.abrir({
    titulo: esNuevo ? 'Registrar proyecto' : `Editar: ${proyecto.nombre}`,
    cuerpo: BC.formulario(campos, proyecto || {}),
    acciones: [
      { texto: 'Cancelar', al: ({ cerrar }) => cerrar() },
      {
        texto: esNuevo ? 'Registrar proyecto' : 'Guardar cambios',
        clase: 'btn',
        al: async ({ cerrar, modal, boton }) => {
          const form = modal.querySelector('form');
          if (!BC.validarFormulario(form)) return;
          boton.disabled = true;
          try {
            const datos = BC.leerFormulario(form);
            if (esNuevo) await BC.api('/proyectos', { method: 'POST', cuerpo: datos });
            else await BC.api(`/proyectos/${proyecto.id}`, { method: 'PUT', cuerpo: datos });
            BC.exito(esNuevo ? 'Proyecto registrado.' : 'Proyecto actualizado.');
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

function modalPunto(proyectoId, punto = null) {
  const esNuevo = !punto;
  const campos = [
    { nombre: 'codigo', etiqueta: 'Código del punto', requerido: true, ayuda: 'Ej.: PM-01' },
    { nombre: 'tipo', etiqueta: 'Tipo de punto', tipo: 'select', opciones: TIPOS_PUNTO, valor: 'Entrada', vacio: false },
    { nombre: 'nombre', etiqueta: 'Nombre descriptivo', ancho: 'completo' },
    { nombre: 'latitud', etiqueta: 'Latitud (coordenada)', tipo: 'number', paso: 'any' },
    { nombre: 'longitud', etiqueta: 'Longitud (coordenada)', tipo: 'number', paso: 'any' },
    { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', ancho: 'completo' },
  ];

  BC.modal.abrir({
    titulo: esNuevo ? 'Registrar punto de muestreo' : `Editar punto ${punto.codigo}`,
    ancho: '660px',
    cuerpo: `
      ${BC.formulario(campos, punto || {})}
      <fieldset style="margin-top:1rem">
        <legend>Fotografía del punto</legend>
        ${punto?.fotografia_ruta
    ? `<img class="miniatura" src="${BC.esc(punto.fotografia_ruta)}" alt="Fotografía del punto ${BC.esc(punto.codigo)}" style="max-width:260px;margin-bottom:.7rem">`
    : ''}
        <input type="file" id="foto-punto" accept="image/*">
        <div class="ayuda">Formatos JPG, PNG o WEBP. Se adjunta al guardar${esNuevo ? ' el punto' : ''}.</div>
      </fieldset>`,
    acciones: [
      { texto: 'Cancelar', al: ({ cerrar }) => cerrar() },
      {
        texto: esNuevo ? 'Registrar punto' : 'Guardar cambios',
        clase: 'btn',
        al: async ({ cerrar, modal, boton }) => {
          const form = modal.querySelector('form');
          if (!BC.validarFormulario(form)) return;
          boton.disabled = true;
          try {
            const datos = BC.leerFormulario(form);
            const guardado = esNuevo
              ? await BC.api(`/proyectos/${proyectoId}/puntos`, { method: 'POST', cuerpo: datos })
              : await BC.api(`/proyectos/puntos/${punto.id}`, { method: 'PUT', cuerpo: datos });

            const archivo = modal.querySelector('#foto-punto').files[0];
            if (archivo) {
              const fd = new FormData();
              fd.append('archivo', archivo);
              fd.append('entidad', 'puntos_muestreo');
              fd.append('entidad_id', guardado.id);
              fd.append('descripcion', `Punto ${guardado.codigo}`);
              const foto = await BC.subirArchivo(fd);
              await BC.api(`/proyectos/puntos/${guardado.id}`, {
                method: 'PUT', cuerpo: { fotografia_id: foto.id },
              });
            }

            BC.exito(esNuevo ? 'Punto de muestreo registrado.' : 'Punto actualizado.');
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

/* ------------------------- Listado de proyectos ------------------------- */

BC.vistaProyectos = async function vistaProyectos(contenedor, parametros) {
  const filtroCliente = parametros[0] === 'cliente' ? Number(parametros[1]) : null;
  const [proyectos, clientes] = await Promise.all([BC.api('/proyectos'), BC.api('/clientes')]);
  const puedeEditar = BC.sesion.puedeEditar();

  const cliente = filtroCliente ? clientes.find((c) => c.id === filtroCliente) : null;

  BC.app.cabecera(
    cliente ? `Proyectos de ${BC.esc(cliente.nombre)}` : 'Proyectos',
    `${proyectos.length} proyecto(s) en total`,
    `${puedeEditar ? `<button class="btn btn-sm" id="btn-nuevo-proyecto" type="button">${BC.icono('mas', { tam: 14 })} Registrar proyecto</button>` : ''}`,
  );

  contenedor.innerHTML = `
    ${cliente ? `<div class="migas"><a href="#/clientes">Clientes</a> › <span>${BC.esc(cliente.nombre)}</span></div>` : ''}

    <section class="filtros">
      <div class="campo">
        <label for="f-buscar-p">Buscar</label>
        <input id="f-buscar-p" type="search" placeholder="Nombre, código, ubicación…">
      </div>
      <div class="campo">
        <label for="f-cliente">Cliente</label>
        <select id="f-cliente">
          <option value="">Todos</option>
          ${clientes.map((c) => `<option value="${c.id}"${c.id === filtroCliente ? ' selected' : ''}>${BC.esc(c.nombre)}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="f-tipo-agua">Tipo de agua</label>
        <select id="f-tipo-agua">
          <option value="">Todos</option>
          ${TIPOS_AGUA.map((t) => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="f-estado">Estado</label>
        <select id="f-estado">
          <option value="">Todos</option>
          ${ESTADOS_PROYECTO.map((t) => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="filtros-acciones"><span class="chip" id="contador-p"></span></div>
    </section>

    <section id="lista-proyectos" class="rejilla rejilla-2"></section>`;

  function pintar() {
    const q = document.getElementById('f-buscar-p').value.trim().toLowerCase();
    const idCliente = document.getElementById('f-cliente').value;
    const tipoAgua = document.getElementById('f-tipo-agua').value;
    const estado = document.getElementById('f-estado').value;

    const filtrados = proyectos.filter((p) => {
      const coincide = !q || [p.nombre, p.codigo, p.ubicacion, p.cliente_nombre]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
      return coincide
        && (!idCliente || p.cliente_id === Number(idCliente))
        && (!tipoAgua || p.tipo_agua === tipoAgua)
        && (!estado || p.estado === estado);
    });

    document.getElementById('contador-p').textContent = `${filtrados.length} de ${proyectos.length}`;
    const lista = document.getElementById('lista-proyectos');

    if (!filtrados.length) {
      lista.className = '';
      lista.innerHTML = BC.vacio('Ningún proyecto coincide con el filtro.', 'buscar');
      return;
    }

    lista.className = 'rejilla rejilla-2';
    lista.innerHTML = filtrados.map((p) => `
      <article class="tarjeta">
        <div class="tarjeta-titulo">
          <div>
            <div class="pequeno tenue mono">${BC.esc(p.codigo || '—')}</div>
            <h3><a href="#/proyecto/${p.id}">${BC.esc(p.nombre)}</a></h3>
          </div>
          ${BC.chipEstadoProyecto(p.estado)}
        </div>

        <div class="fila envuelve" style="margin-bottom:.85rem">
          <span class="chip">${BC.icono(BC.iconoTipoAgua(p.tipo_agua), { tam: 13 })} ${BC.esc(p.tipo_agua)}</span>
          <span class="chip">${BC.icono('edificio', { tam: 13 })} ${BC.esc(p.cliente_nombre)}</span>
          ${p.caudal_m3_dia ? `<span class="chip">${BC.icono('gota', { tam: 13 })} ${BC.num(p.caudal_m3_dia, 0)} m³/día</span>` : ''}
        </div>

        <div class="datos-lista">
          <div class="dato">
            <div class="dato-etiqueta">Ubicación</div>
            <div class="dato-valor">${BC.esc(p.ubicacion || '—')}</div>
          </div>
          <div class="dato">
            <div class="dato-etiqueta">Periodo</div>
            <div class="dato-valor">${BC.fecha(p.fecha_inicio)} → ${p.fecha_fin ? BC.fecha(p.fecha_fin) : 'en curso'}</div>
          </div>
          <div class="dato">
            <div class="dato-etiqueta">Puntos de muestreo</div>
            <div class="dato-valor">${p.total_puntos}</div>
          </div>
          <div class="dato">
            <div class="dato-etiqueta">Análisis registrados</div>
            <div class="dato-valor">${p.total_muestreos}</div>
          </div>
        </div>

        <div class="fila envuelve" style="margin-top:1rem">
          <a class="btn btn-suave btn-sm" href="#/proyecto/${p.id}">Abrir proyecto →</a>
          <a class="btn btn-fantasma btn-sm" href="#/proyecto/${p.id}/analisis">Análisis</a>
          ${puedeEditar ? `<button class="btn btn-fantasma btn-sm" data-editar-p="${p.id}" type="button">Editar</button>` : ''}
        </div>
      </article>`).join('');

    for (const btn of lista.querySelectorAll('[data-editar-p]')) {
      btn.addEventListener('click', () => modalProyecto(proyectos.find((p) => p.id === Number(btn.dataset.editarP))));
    }
  }

  for (const id of ['f-buscar-p', 'f-cliente', 'f-tipo-agua', 'f-estado']) {
    const nodo = document.getElementById(id);
    nodo.addEventListener(id === 'f-buscar-p' ? 'input' : 'change', pintar);
  }
  document.getElementById('btn-nuevo-proyecto')?.addEventListener('click', () => modalProyecto());

  pintar();
};

/* ------------------------- Detalle de un proyecto ------------------------- */

BC.vistaProyectoDetalle = async function vistaProyectoDetalle(contenedor, parametros) {
  const id = Number(parametros[0]);
  const pestanaActiva = parametros[1] || 'resumen';
  if (!id) {
    contenedor.innerHTML = BC.vacio('Proyecto no indicado.', 'objetivo');
    return;
  }

  const proyecto = await BC.api(`/proyectos/${id}`);
  const puedeEditar = BC.sesion.puedeEditar();

  BC.app.cabecera(
    BC.esc(proyecto.nombre),
    `${BC.esc(proyecto.cliente_nombre)} · ${BC.esc(proyecto.tipo_agua)} · ${BC.esc(proyecto.ubicacion || 'sin ubicación')}`,
    `${puedeEditar ? `
      <button class="btn btn-fantasma btn-sm" id="btn-editar-proyecto" type="button">Editar proyecto</button>
      <a class="btn btn-sm" href="#/analisis/nuevo/${id}">${BC.icono('mas', { tam: 14 })} Registrar análisis</a>` : ''}`,
  );

  const pestanas = [
    { clave: 'resumen', icono: 'documento', texto: 'Resumen' },
    { clave: 'puntos', icono: 'mapa-pin', texto: `Puntos (${proyecto.puntos.length})` },
    { clave: 'muestreos', icono: 'matraz', texto: `Análisis (${proyecto.muestreos.length})` },
    { clave: 'analisis', icono: 'rayo', texto: 'Comparativa antes/después' },
    { clave: 'historial', icono: 'reloj', texto: 'Histórico' },
  ];

  contenedor.innerHTML = `
    <div class="migas">
      <a href="#/proyectos">Proyectos</a> › <span>${BC.esc(proyecto.codigo || proyecto.nombre)}</span>
    </div>

    <div class="pestanas">
      ${pestanas.map((p) => `
        <a class="pestana ${p.clave === pestanaActiva ? 'activa' : ''}" href="#/proyecto/${id}/${p.clave}">${BC.icono(p.icono, { tam: 14 })} ${p.texto}</a>`).join('')}
    </div>

    <div id="panel-pestana">${BC.cargando()}</div>`;

  document.getElementById('btn-editar-proyecto')?.addEventListener('click', () => modalProyecto(proyecto));

  const panel = document.getElementById('panel-pestana');

  if (pestanaActiva === 'resumen') pintarResumen(panel, proyecto);
  else if (pestanaActiva === 'puntos') pintarPuntos(panel, proyecto, puedeEditar);
  else if (pestanaActiva === 'muestreos') pintarMuestreos(panel, proyecto, puedeEditar);
  else if (pestanaActiva === 'analisis') await BC.pintarComparativa(panel, id);
  else if (pestanaActiva === 'historial') await pintarHistorialProyecto(panel, id);
  else panel.innerHTML = BC.vacio('Pestaña no encontrada.', 'objetivo');
};

/* ------------------------------ Pestañas ------------------------------ */

function pintarResumen(panel, p) {
  const antes = p.muestreos.filter((m) => m.etapa === 'antes').length;
  const despues = p.muestreos.filter((m) => m.etapa === 'despues').length;

  panel.innerHTML = `
    <section class="rejilla rejilla-4">
      ${BC.indicador({ etiqueta: 'Estado', valor: BC.esc(p.estado), icono: 'rayo', acento: p.estado === 'Activo' ? 'var(--estado-bueno)' : 'var(--muted)' })}
      ${BC.indicador({ etiqueta: 'Puntos de muestreo', valor: p.puntos.length, icono: 'mapa-pin', acento: 'var(--serie-3)' })}
      ${BC.indicador({ etiqueta: 'Muestras "antes"', valor: antes, icono: 'gota', acento: 'var(--serie-1)' })}
      ${BC.indicador({ etiqueta: 'Muestras "después"', valor: despues, icono: 'gota-check', acento: 'var(--serie-2)' })}
    </section>

    <section class="rejilla" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);margin-top:1.15rem">
      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Datos del proyecto</h3></div>
        <div class="datos-lista">
          <div class="dato"><div class="dato-etiqueta">Código</div><div class="dato-valor mono">${BC.esc(p.codigo || '—')}</div></div>
          <div class="dato"><div class="dato-etiqueta">Tipo de agua</div><div class="dato-valor">${BC.icono(BC.iconoTipoAgua(p.tipo_agua), { tam: 14 })} ${BC.esc(p.tipo_agua)}</div></div>
          <div class="dato"><div class="dato-etiqueta">Caudal de diseño</div><div class="dato-valor">${p.caudal_m3_dia ? `${BC.num(p.caudal_m3_dia, 0)} m³/día` : '—'}</div></div>
          <div class="dato"><div class="dato-etiqueta">Fecha de inicio</div><div class="dato-valor">${BC.fecha(p.fecha_inicio, true)}</div></div>
          <div class="dato"><div class="dato-etiqueta">Fecha de fin</div><div class="dato-valor">${p.fecha_fin ? BC.fecha(p.fecha_fin, true) : 'En curso'}</div></div>
          <div class="dato"><div class="dato-etiqueta">Coordenadas</div><div class="dato-valor mono">${p.latitud && p.longitud ? `${p.latitud}, ${p.longitud}` : '—'}</div></div>
        </div>
        ${p.descripcion ? `
          <div style="margin-top:1rem">
            <div class="dato-etiqueta">Descripción</div>
            <p class="pequeno" style="margin-top:.3rem">${BC.esc(p.descripcion)}</p>
          </div>` : ''}
      </div>

      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Cliente</h3></div>
        <div class="datos-lista">
          <div class="dato"><div class="dato-etiqueta">Organización</div><div class="dato-valor">${BC.esc(p.cliente_nombre)}</div></div>
          <div class="dato"><div class="dato-etiqueta">Tipo</div><div class="dato-valor">${BC.esc(p.cliente_tipo)}</div></div>
          <div class="dato"><div class="dato-etiqueta">Contacto</div><div class="dato-valor">${BC.esc(p.cliente_contacto || '—')}</div></div>
          <div class="dato"><div class="dato-etiqueta">Correo</div><div class="dato-valor">${BC.esc(p.cliente_correo || '—')}</div></div>
          <div class="dato"><div class="dato-etiqueta">Teléfono</div><div class="dato-valor">${BC.esc(p.cliente_telefono || '—')}</div></div>
          <div class="dato"><div class="dato-etiqueta">Dirección</div><div class="dato-valor">${BC.esc(p.cliente_direccion || '—')}</div></div>
        </div>
      </div>
    </section>

    ${p.latitud && p.longitud ? `
      <section class="tarjeta" style="margin-top:1.15rem">
        <div class="tarjeta-titulo"><h3>Ubicación y puntos de muestreo</h3></div>
        <div class="mapa" id="mapa-proyecto"></div>
      </section>` : ''}`;

  if (p.latitud && p.longitud) {
    const marcadores = [
      {
        id: p.id, nombre: p.nombre, cliente: p.cliente_nombre, ubicacion: p.ubicacion,
        tipo_agua: p.tipo_agua, estado: p.estado, latitud: p.latitud, longitud: p.longitud,
        reduccion: null, cumplimiento: null, calidad: null,
      },
      ...p.puntos.filter((pt) => pt.latitud && pt.longitud).map((pt) => ({
        id: pt.id, nombre: `${pt.codigo} — ${pt.nombre || pt.tipo}`, cliente: p.nombre,
        ubicacion: pt.descripcion || '', tipo_agua: pt.tipo, estado: 'Punto de muestreo',
        latitud: pt.latitud, longitud: pt.longitud,
        reduccion: null, cumplimiento: null, calidad: null,
      })),
    ];
    BC.graficos.mapaProyectos('mapa-proyecto', marcadores);
  }
}

function pintarPuntos(panel, proyecto, puedeEditar) {
  panel.innerHTML = `
    <section class="tarjeta">
      <div class="tarjeta-titulo">
        <h3>Puntos de muestreo</h3>
        ${puedeEditar ? `<button class="btn btn-sm" id="btn-nuevo-punto" type="button">${BC.icono('mas', { tam: 14 })} Registrar punto</button>` : ''}
      </div>

      ${proyecto.puntos.length ? `
        <div class="rejilla rejilla-3">
          ${proyecto.puntos.map((pt) => `
            <article class="panel">
              <div class="entre" style="margin-bottom:.7rem">
                <div>
                  <div class="pequeno tenue mono">${BC.esc(pt.codigo)}</div>
                  <h3 style="margin:0;font-size:1rem">${BC.esc(pt.nombre || pt.tipo)}</h3>
                </div>
                <span class="chip">${BC.esc(pt.tipo)}</span>
              </div>

              ${pt.fotografia_ruta
    ? `<img class="miniatura" src="${BC.esc(pt.fotografia_ruta)}" alt="Fotografía del punto ${BC.esc(pt.codigo)}" style="margin-bottom:.7rem">`
    : '<div class="miniatura" style="display:grid;place-items:center;color:var(--muted);font-size:.8rem;margin-bottom:.7rem">Sin fotografía</div>'}

              <div class="datos-lista">
                <div class="dato">
                  <div class="dato-etiqueta">Coordenadas</div>
                  <div class="dato-valor mono pequeno">${pt.latitud && pt.longitud ? `${pt.latitud}, ${pt.longitud}` : '—'}</div>
                </div>
                <div class="dato">
                  <div class="dato-etiqueta">Muestreos</div>
                  <div class="dato-valor">${pt.total_muestreos ?? 0}</div>
                </div>
              </div>

              ${pt.descripcion ? `<p class="pequeno tenue" style="margin:.7rem 0 0">${BC.esc(pt.descripcion)}</p>` : ''}

              ${puedeEditar ? `
                <div class="fila" style="margin-top:.85rem">
                  <button class="btn btn-fantasma btn-sm" data-editar-pt="${pt.id}" type="button">Editar</button>
                  <button class="btn btn-peligro btn-sm" data-borrar-pt="${pt.id}" type="button">Eliminar</button>
                </div>` : ''}
            </article>`).join('')}
        </div>` : BC.vacio('Este proyecto todavía no tiene puntos de muestreo.', 'mapa-pin')}
    </section>`;

  document.getElementById('btn-nuevo-punto')?.addEventListener('click', () => modalPunto(proyecto.id));
  for (const btn of panel.querySelectorAll('[data-editar-pt]')) {
    btn.addEventListener('click', () => {
      modalPunto(proyecto.id, proyecto.puntos.find((pt) => pt.id === Number(btn.dataset.editarPt)));
    });
  }
  for (const btn of panel.querySelectorAll('[data-borrar-pt]')) {
    btn.addEventListener('click', async () => {
      const pt = proyecto.puntos.find((x) => x.id === Number(btn.dataset.borrarPt));
      const ok = await BC.modal.confirmar({
        titulo: 'Eliminar punto de muestreo',
        mensaje: `¿Eliminar el punto ${pt.codigo}? Los muestreos asociados quedarán sin punto asignado.`,
        textoAceptar: 'Eliminar', peligro: true,
      });
      if (!ok) return;
      try {
        await BC.api(`/proyectos/puntos/${pt.id}`, { method: 'DELETE' });
        BC.exito('Punto eliminado.');
        await BC.app.enrutar();
      } catch (e) { BC.error(e); }
    });
  }
}

function pintarMuestreos(panel, proyecto, puedeEditar) {
  const filas = proyecto.muestreos;

  panel.innerHTML = `
    <section class="tarjeta">
      <div class="tarjeta-titulo">
        <h3>Análisis de agua registrados</h3>
        ${puedeEditar ? `<a class="btn btn-sm" href="#/analisis/nuevo/${proyecto.id}">${BC.icono('mas', { tam: 14 })} Registrar análisis</a>` : ''}
      </div>

      ${filas.length ? `
        <div class="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>Muestra</th><th>Etapa</th><th>Fecha</th><th>Punto</th>
                <th>Lote de biocápsulas</th><th>Responsable</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${filas.map((m) => `
                <tr>
                  <td><strong>${BC.esc(m.codigo)}</strong></td>
                  <td>${m.etapa === 'antes'
    ? '<span class="chip" style="border-color:rgba(217,89,38,.45);color:#f0a07c">Antes</span>'
    : '<span class="chip" style="border-color:rgba(25,158,112,.5);color:#6ee0b0">Después</span>'}</td>
                  <td>${BC.fecha(m.fecha_muestreo)}${m.hora ? ` <span class="tenue pequeno">${BC.esc(m.hora)}</span>` : ''}</td>
                  <td>${BC.esc(m.punto_codigo || '—')}</td>
                  <td class="mono pequeno">${BC.esc(m.biocapsula_lote || '—')}</td>
                  <td class="pequeno">${BC.esc(m.responsable || '—')}</td>
                  <td class="derecha"><a class="btn btn-fantasma btn-sm" href="#/muestreo/${m.id}">Ver</a></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : BC.vacio('Todavía no hay análisis registrados en este proyecto.', 'matraz')}
    </section>`;
}

async function pintarHistorialProyecto(panel, proyectoId) {
  const h = await BC.api(`/historial/proyecto/${proyectoId}`);

  panel.innerHTML = `
    <section class="rejilla" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)">
      <div class="tarjeta">
        <div class="tarjeta-titulo"><h3>Línea de tiempo de muestreos</h3></div>
        ${h.muestreos.length ? `
          <div class="tiempo">
            ${h.muestreos.map((m) => `
              <div class="tiempo-item">
                <div class="tiempo-punto"><span class="punto-estado" style="--color-estado:${m.etapa === 'antes' ? 'var(--serie-1)' : 'var(--serie-2)'}"></span></div>
                <div>
                  <div class="tiempo-titulo">
                    <a href="#/muestreo/${m.id}">${BC.esc(m.codigo)}</a>
                    — ${m.etapa === 'antes' ? 'antes' : 'después'} del tratamiento
                  </div>
                  <div class="tiempo-meta">
                    ${BC.fecha(m.fecha_muestreo, true)}${m.hora ? ` · ${BC.esc(m.hora)}` : ''}
                    · ${m.parametros_registrados} parámetro(s)
                  </div>
                  <div class="tiempo-meta">
                    Punto ${BC.esc(m.punto_codigo || '—')}
                    ${m.biocapsula_lote ? ` · lote ${BC.esc(m.biocapsula_lote)}` : ''}
                    ${m.responsable ? ` · ${BC.esc(m.responsable)}` : ''}
                  </div>
                </div>
              </div>`).join('')}
          </div>` : BC.vacio('Sin muestreos registrados.', 'reloj')}
      </div>

      <div>
        <div class="tarjeta" style="margin-bottom:1.15rem">
          <div class="tarjeta-titulo"><h3>Reportes emitidos</h3></div>
          ${h.reportes.length ? `
            <div class="tiempo">
              ${h.reportes.map((r) => `
                <div class="tiempo-item">
                  <div class="tiempo-punto">${BC.icono('documento', { tam: 13 })}</div>
                  <div>
                    <div class="tiempo-titulo mono">${BC.esc(r.codigo)}</div>
                    <div class="tiempo-meta">${BC.fechaHora(r.created_at)}</div>
                    <div class="tiempo-meta">
                      <a href="/verificar/${BC.esc(r.token)}" target="_blank" rel="noopener">Verificar ↗</a>
                    </div>
                  </div>
                </div>`).join('')}
            </div>` : BC.vacio('Sin reportes emitidos.', 'documento')}
        </div>

        <div class="tarjeta">
          <div class="tarjeta-titulo"><h3>Eventos del sistema</h3></div>
          ${h.eventos.length ? `
            <div class="tiempo">
              ${h.eventos.slice(0, 14).map((e) => `
                <div class="tiempo-item">
                  <div class="tiempo-punto">•</div>
                  <div>
                    <div class="tiempo-titulo">${BC.esc(e.accion)}</div>
                    <div class="tiempo-meta">${BC.esc(e.detalle || '')}</div>
                    <div class="tiempo-meta">${BC.esc(e.usuario || 'sistema')} · ${BC.fechaHora(e.created_at)}</div>
                  </div>
                </div>`).join('')}
            </div>` : BC.vacio('Sin eventos.', 'reloj')}
        </div>
      </div>
    </section>`;
}
