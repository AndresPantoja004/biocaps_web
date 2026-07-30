/* ============================================================================
   BioCaps Monitor® — Módulo 4: Clientes  ·  y gestión de usuarios
   ========================================================================= */

const TIPOS_CLIENTE = ['Empresa', 'Municipio', 'Industria', 'Ganadería', 'Universidad'];


function camposCliente() {
  return [
    { nombre: 'nombre', etiqueta: 'Nombre / Empresa', requerido: true, ancho: 'completo' },
    { nombre: 'tipo', etiqueta: 'Tipo de cliente', tipo: 'select', opciones: TIPOS_CLIENTE, requerido: true },
    { nombre: 'ruc', etiqueta: 'RUC / Identificación' },
    { nombre: 'contacto', etiqueta: 'Persona de contacto' },
    { nombre: 'cargo', etiqueta: 'Cargo del contacto' },
    { nombre: 'correo', etiqueta: 'Correo electrónico', tipo: 'email' },
    { nombre: 'telefono', etiqueta: 'Teléfono' },
    { nombre: 'direccion', etiqueta: 'Dirección', ancho: 'completo' },
    { nombre: 'ciudad', etiqueta: 'Ciudad' },
    { nombre: 'provincia', etiqueta: 'Provincia' },
    { nombre: 'notas', etiqueta: 'Notas', tipo: 'textarea', ancho: 'completo' },
  ];
}

function modalCliente(cliente = null) {
  const esNuevo = !cliente;
  BC.modal.abrir({
    titulo: esNuevo ? 'Registrar cliente' : `Editar: ${cliente.nombre}`,
    cuerpo: BC.formulario(camposCliente(), cliente || {}),
    acciones: [
      { texto: 'Cancelar', al: ({ cerrar }) => cerrar() },
      {
        texto: esNuevo ? 'Registrar cliente' : 'Guardar cambios',
        clase: 'btn',
        al: async ({ cerrar, modal, boton }) => {
          const form = modal.querySelector('form');
          if (!BC.validarFormulario(form)) return;
          boton.disabled = true;
          try {
            const datos = BC.leerFormulario(form);
            if (esNuevo) await BC.api('/clientes', { method: 'POST', cuerpo: datos });
            else await BC.api(`/clientes/${cliente.id}`, { method: 'PUT', cuerpo: datos });
            BC.exito(esNuevo ? 'Cliente registrado.' : 'Cliente actualizado.');
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

BC.vistaClientes = async function vistaClientes(contenedor) {
  const clientes = await BC.api('/clientes');
  const puedeEditar = BC.sesion.puedeEditar();

  BC.app.cabecera(
    'Clientes',
    `${clientes.length} cliente(s) registrado(s)`,
    `${puedeEditar ? `<button class="btn btn-sm" id="btn-nuevo-cliente" type="button">${BC.icono('mas', { tam: 14 })} Registrar cliente</button>` : ''}
     <button class="btn btn-fantasma btn-sm" id="btn-csv" type="button">${BC.icono('descargar', { tam: 14 })} CSV</button>`,
  );

  const porTipo = TIPOS_CLIENTE.map((tipo) => ({
    tipo, total: clientes.filter((c) => c.tipo === tipo).length,
  })).filter((x) => x.total > 0);

  contenedor.innerHTML = `
    <section class="rejilla rejilla-4">
      ${porTipo.map((x, i) => BC.indicador({
    etiqueta: x.tipo, valor: BC.num(x.total, 0), icono: BC.iconoTipoCliente(x.tipo),
    acento: `var(--serie-${(i % 8) + 1})`,
  })).join('')}
    </section>

    <section class="filtros">
      <div class="campo">
        <label for="f-buscar">Buscar</label>
        <input id="f-buscar" type="search" placeholder="Nombre, contacto, ciudad…">
      </div>
      <div class="campo">
        <label for="f-tipo">Tipo de cliente</label>
        <select id="f-tipo">
          <option value="">Todos</option>
          ${TIPOS_CLIENTE.map((t) => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="filtros-acciones"><span class="chip" id="contador-filtro"></span></div>
    </section>

    <section class="tarjeta">
      <div class="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Cliente</th><th>Tipo</th><th>Contacto</th><th>Ubicación</th>
              <th class="num">Proyectos</th><th class="num">Activos</th><th></th>
            </tr>
          </thead>
          <tbody id="cuerpo-clientes"></tbody>
        </table>
      </div>
      <div id="sin-clientes"></div>
    </section>`;

  const cuerpo = document.getElementById('cuerpo-clientes');
  const sinDatos = document.getElementById('sin-clientes');
  const contadorFiltro = document.getElementById('contador-filtro');

  function pintar() {
    const q = document.getElementById('f-buscar').value.trim().toLowerCase();
    const tipo = document.getElementById('f-tipo').value;

    const filtrados = clientes.filter((c) => {
      const coincide = !q || [c.nombre, c.contacto, c.ciudad, c.correo, c.ruc]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
      return coincide && (!tipo || c.tipo === tipo);
    });

    contadorFiltro.textContent = `${filtrados.length} de ${clientes.length}`;
    sinDatos.innerHTML = filtrados.length ? '' : BC.vacio('Ningún cliente coincide con el filtro.', 'buscar');

    cuerpo.innerHTML = filtrados.map((c) => `
      <tr>
        <td>
          <strong>${BC.esc(c.nombre)}</strong>
          ${c.ruc ? `<div class="pequeno tenue">RUC ${BC.esc(c.ruc)}</div>` : ''}
        </td>
        <td><span class="chip">${BC.icono(BC.iconoTipoCliente(c.tipo), { tam: 13 })} ${BC.esc(c.tipo)}</span></td>
        <td>
          ${BC.esc(c.contacto || '—')}
          ${c.correo ? `<div class="pequeno tenue">${BC.esc(c.correo)}</div>` : ''}
          ${c.telefono ? `<div class="pequeno tenue">${BC.esc(c.telefono)}</div>` : ''}
        </td>
        <td>
          ${BC.esc(c.ciudad || '—')}
          ${c.direccion ? `<div class="pequeno tenue">${BC.esc(c.direccion)}</div>` : ''}
        </td>
        <td class="num">${c.total_proyectos}</td>
        <td class="num">${c.proyectos_activos}</td>
        <td class="derecha" style="white-space:nowrap">
          <a class="btn btn-fantasma btn-sm" href="#/proyectos/cliente/${c.id}">Proyectos</a>
          ${puedeEditar ? `<button class="btn btn-fantasma btn-sm" data-editar="${c.id}" type="button">Editar</button>` : ''}
          ${BC.sesion.esAdmin() ? `<button class="btn btn-peligro btn-sm" data-borrar="${c.id}" type="button">Eliminar</button>` : ''}
        </td>
      </tr>`).join('');

    for (const btn of cuerpo.querySelectorAll('[data-editar]')) {
      btn.addEventListener('click', () => {
        modalCliente(clientes.find((c) => c.id === Number(btn.dataset.editar)));
      });
    }
    for (const btn of cuerpo.querySelectorAll('[data-borrar]')) {
      btn.addEventListener('click', async () => {
        const cliente = clientes.find((c) => c.id === Number(btn.dataset.borrar));
        const ok = await BC.modal.confirmar({
          titulo: 'Eliminar cliente',
          mensaje: `¿Eliminar definitivamente a "${cliente.nombre}"? Esta acción no se puede deshacer.`,
          textoAceptar: 'Eliminar', peligro: true,
        });
        if (!ok) return;
        try {
          await BC.api(`/clientes/${cliente.id}`, { method: 'DELETE' });
          BC.exito('Cliente eliminado.');
          await BC.app.enrutar();
          BC.app.actualizarContadores();
        } catch (e) { BC.error(e); }
      });
    }
  }

  document.getElementById('f-buscar').addEventListener('input', pintar);
  document.getElementById('f-tipo').addEventListener('change', pintar);
  document.getElementById('btn-nuevo-cliente')?.addEventListener('click', () => modalCliente());
  document.getElementById('btn-csv').addEventListener('click', () => {
    const filas = [['Nombre', 'Tipo', 'RUC', 'Contacto', 'Cargo', 'Correo', 'Teléfono', 'Dirección', 'Ciudad', 'Provincia', 'Proyectos']];
    for (const c of clientes) {
      filas.push([c.nombre, c.tipo, c.ruc, c.contacto, c.cargo, c.correo, c.telefono, c.direccion, c.ciudad, c.provincia, c.total_proyectos]);
    }
    BC.descargar(BC.aCSV(filas), 'biocaps-clientes.csv');
  });

  pintar();
};

/* ============================== Usuarios ============================== */

BC.vistaUsuarios = async function vistaUsuarios(contenedor) {
  if (!BC.sesion.esAdmin()) {
    BC.app.cabecera('Usuarios', '');
    contenedor.innerHTML = BC.vacio('Sólo el administrador puede gestionar usuarios.', 'candado');
    return;
  }

  const [usuarios, clientes] = await Promise.all([BC.api('/auth/usuarios'), BC.api('/clientes')]);

  BC.app.cabecera(
    'Usuarios de la plataforma',
    `${usuarios.length} cuenta(s) · roles: administrador, analista y cliente`,
    `<button class="btn btn-sm" id="btn-nuevo-usuario" type="button">${BC.icono('mas', { tam: 14 })} Crear usuario</button>`,
  );

  const campos = (usuario = null) => [
    { nombre: 'nombre', etiqueta: 'Nombre completo', requerido: true, ancho: 'completo' },
    {
      nombre: 'email', etiqueta: 'Correo electrónico', tipo: 'email',
      requerido: !usuario, ancho: usuario ? undefined : 'completo',
    },
    {
      nombre: 'rol', etiqueta: 'Rol', tipo: 'select', requerido: true,
      opciones: [
        { valor: 'administrador', texto: 'Administrador — configura límites y usuarios' },
        { valor: 'analista', texto: 'Analista — registra muestreos y emite reportes' },
        { valor: 'cliente', texto: 'Cliente — consulta sus propios proyectos' },
      ],
    },
    {
      nombre: 'cliente_id', etiqueta: 'Cliente asociado', tipo: 'select',
      opciones: clientes.map((c) => ({ valor: c.id, texto: c.nombre })),
      ayuda: 'Obligatorio sólo para el rol "cliente".',
    },
    { nombre: 'cargo', etiqueta: 'Cargo' },
    { nombre: 'telefono', etiqueta: 'Teléfono' },
    {
      nombre: 'password', etiqueta: usuario ? 'Nueva contraseña (opcional)' : 'Contraseña',
      tipo: 'password', requerido: !usuario, ancho: 'completo', ayuda: 'Mínimo 6 caracteres.',
    },
  ];

  function modalUsuario(usuario = null) {
    BC.modal.abrir({
      titulo: usuario ? `Editar: ${usuario.nombre}` : 'Crear usuario',
      cuerpo: BC.formulario(campos(usuario), usuario || {}),
      acciones: [
        { texto: 'Cancelar', al: ({ cerrar }) => cerrar() },
        {
          texto: usuario ? 'Guardar' : 'Crear usuario',
          clase: 'btn',
          al: async ({ cerrar, modal, boton }) => {
            const form = modal.querySelector('form');
            if (!BC.validarFormulario(form)) return;
            const datos = BC.leerFormulario(form);
            if (datos.rol === 'cliente' && !datos.cliente_id) {
              return BC.notificar('Seleccione el cliente asociado a esta cuenta.', 'error');
            }
            boton.disabled = true;
            try {
              if (usuario) {
                if (!datos.password) delete datos.password;
                delete datos.email;
                await BC.api(`/auth/usuarios/${usuario.id}`, { method: 'PATCH', cuerpo: datos });
              } else {
                await BC.api('/auth/usuarios', { method: 'POST', cuerpo: datos });
              }
              BC.exito(usuario ? 'Usuario actualizado.' : 'Usuario creado.');
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


  contenedor.innerHTML = `
    <section class="tarjeta">
      <div class="tabla-envoltura">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Rol</th><th>Cliente</th><th>Último acceso</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            ${usuarios.map((u) => `
              <tr>
                <td>
                  <strong>${BC.esc(u.nombre)}</strong>
                  <div class="pequeno tenue">${BC.esc(u.email)}</div>
                  ${u.cargo ? `<div class="pequeno tenue">${BC.esc(u.cargo)}</div>` : ''}
                </td>
                <td><span class="chip">${BC.icono(BC.iconoRol(u.rol), { tam: 13 })} ${BC.esc(u.rol)}</span></td>
                <td>${BC.esc(u.cliente_nombre || '—')}</td>
                <td class="pequeno">${u.ultimo_acceso ? BC.fechaHora(u.ultimo_acceso) : 'Nunca'}</td>
                <td>${u.activo
    ? '<span class="estado estado-excelente">Activo</span>'
    : '<span class="estado estado-critico">Pendiente / inactivo</span>'}</td>
                <td class="derecha" style="white-space:nowrap">
                  ${u.id === BC.sesion.usuario.id ? '' : (u.activo
    ? `<button class="btn btn-fantasma btn-sm" data-activar="${u.id}" data-valor="0" type="button">Desactivar</button>`
    : `<button class="btn btn-suave btn-sm" data-activar="${u.id}" data-valor="1" type="button">Aprobar</button>`)}
                  <button class="btn btn-fantasma btn-sm" data-editar-u="${u.id}" type="button">Editar</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="aviso aviso-info">
      <span class="aviso-icono">${BC.icono('info', { tam: 17 })}</span>
      <div class="aviso-cuerpo">
        <div class="aviso-titulo">Permisos por rol</div>
        <div class="pequeno">
          <b>Administrador:</b> acceso total, configura los límites del semáforo y administra usuarios. ·
          <b>Analista:</b> registra clientes, proyectos, puntos, muestreos y emite reportes. ·
          <b>Cliente:</b> sólo consulta los proyectos, análisis y reportes de su propia organización.
        </div>
      </div>
    </section>`;

  document.getElementById('btn-nuevo-usuario').addEventListener('click', () => modalUsuario());
  for (const btn of contenedor.querySelectorAll('[data-editar-u]')) {
    btn.addEventListener('click', () => {
      modalUsuario(usuarios.find((u) => u.id === Number(btn.dataset.editarU)));
    });
  }
  for (const btn of contenedor.querySelectorAll('[data-activar]')) {
    btn.addEventListener('click', async () => {
      const u = usuarios.find((x) => x.id === Number(btn.dataset.activar));
      const activar = btn.dataset.valor === '1';
      const ok = await BC.modal.confirmar({
        titulo: activar ? 'Aprobar cuenta' : 'Desactivar cuenta',
        mensaje: activar
          ? `¿Habilitar el acceso de ${u.nombre} (${u.email})?`
          : `¿Desactivar la cuenta de ${u.nombre}? No podrá iniciar sesión hasta que la reactive.`,
        textoAceptar: activar ? 'Aprobar' : 'Desactivar',
        peligro: !activar,
      });
      if (!ok) return;
      try {
        await BC.api(`/auth/usuarios/${u.id}`, { method: 'PATCH', cuerpo: { activo: activar } });
        BC.exito(activar ? 'Cuenta habilitada.' : 'Cuenta desactivada.');
        await BC.app.enrutar();
      } catch (e) { BC.error(e); }
    });
  }
};
