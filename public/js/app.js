/* ============================================================================
   BioCaps Monitor® — Armazón de la plataforma
   Módulo 2 (login por roles), navegación y enrutador de vistas.
   ========================================================================= */

/* ------------------------------- Sesión ------------------------------- */

BC.sesion = {
  usuario: null,

  async cargar() {
    if (!localStorage.getItem('biocaps_token')) return null;
    try {
      this.usuario = await BC.api('/auth/yo');
      return this.usuario;
    } catch {
      this.cerrarLocal();
      return null;
    }
  },

  async iniciar(email, password) {
    const r = await BC.api('/auth/login', { method: 'POST', cuerpo: { email, password } });
    localStorage.setItem('biocaps_token', r.token);
    this.usuario = r.usuario;
    return r.usuario;
  },

  async cerrar() {
    try { await BC.api('/auth/logout', { method: 'POST' }); } catch { /* sin conexión */ }
    this.cerrarLocal();
  },

  cerrarLocal() {
    localStorage.removeItem('biocaps_token');
    this.usuario = null;
    if (!location.hash.startsWith('#/login')) location.hash = '';
    BC.app?.pintarLogin?.();
  },

  puedeEditar() {
    return ['administrador', 'analista'].includes(this.usuario?.rol);
  },

  esAdmin() {
    return this.usuario?.rol === 'administrador';
  },
};

/* ------------------------------ Aplicación ------------------------------ */

BC.app = {
  vistas: {},
  raiz: null,
  contadores: {},

  /* ------------------------- Acceso y registro ------------------------- */

  async pintarLogin(mensaje, pestana = 'ingresar') {
    BC.graficos.destruirTodos();

    let opciones = {
      registro_publico: true, requiere_aprobacion: false,
      password_minimo: 6, demo_disponible: false,
      tipos_cliente: ['Empresa', 'Municipio', 'Industria', 'Ganadería', 'Universidad'],
    };
    try {
      opciones = await BC.api('/auth/opciones');
    } catch { /* si falla, se usan los valores por defecto */ }

    const ventajas = [
      ['matraz', 'Registro de análisis fisicoquímicos y biológicos antes y después del tratamiento.'],
      ['rayo', 'Cálculo automático de la remoción de NH₄⁺-N, DBO₅, DQO, SST y turbidez.'],
      ['objetivo', 'Indicadores tipo semáforo según límites máximos permisibles configurables.'],
      ['documento', 'Reportes técnicos en PDF con firma y código QR de verificación.'],
    ];

    this.raiz.innerHTML = `
      <div class="login-pantalla">
        <aside class="login-lateral">
          <a class="marca" href="/">
            <img src="/assets/LogoBiocaps.png" alt="">
            <span class="marca-texto">
              <span class="marca-nombre">BioCaps Monitor<sup>®</sup></span>
              <span class="marca-sub">Biotecnología del agua</span>
            </span>
          </a>

          <div>
            <h2>Monitoreo inteligente del tratamiento de aguas residuales</h2>
            <ul class="login-lista">
              ${ventajas.map(([ic, texto]) => `
                <li>
                  <span class="icono-caja icono-caja-sm">${BC.icono(ic, { tam: 15 })}</span>
                  <div>${texto}</div>
                </li>`).join('')}
            </ul>
          </div>

          <p class="pequeno tenue" style="margin:0">
            Límites de referencia: TULSMA — Acuerdo Ministerial 097-A, Anexo 1, Tabla 9
            (descarga a cuerpo de agua dulce).
          </p>
        </aside>

        <section class="login-panel">
          <div class="login-caja">
            <div class="marca" style="margin-bottom:1.5rem">
              <img src="/assets/LogoBiocaps.png" alt="">
              <span class="marca-texto">
                <span class="marca-nombre">BioCaps Monitor<sup>®</sup></span>
                <span class="marca-sub">Acceso a la plataforma</span>
              </span>
            </div>

            ${opciones.registro_publico ? `
              <div class="conmutador" role="tablist">
                <button class="conmutador-opcion ${pestana === 'ingresar' ? 'activa' : ''}"
                        type="button" data-pestana="ingresar" role="tab">Iniciar sesión</button>
                <button class="conmutador-opcion ${pestana === 'registro' ? 'activa' : ''}"
                        type="button" data-pestana="registro" role="tab">Crear cuenta</button>
              </div>` : ''}

            ${mensaje ? `
              <div class="aviso aviso-error">
                <span class="aviso-icono">${BC.icono('alerta', { tam: 17 })}</span>
                <div class="aviso-cuerpo">${BC.esc(mensaje)}</div>
              </div>` : ''}

            <div id="panel-acceso"></div>

            <p class="pequeno tenue" style="margin-top:1.4rem">
              <a href="/">← Volver al sitio público</a>
            </p>
          </div>
        </section>
      </div>`;

    const panel = document.getElementById('panel-acceso');
    const mostrar = (cual) => {
      for (const b of document.querySelectorAll('.conmutador-opcion')) {
        b.classList.toggle('activa', b.dataset.pestana === cual);
      }
      if (cual === 'registro') this.pintarFormularioRegistro(panel, opciones);
      else this.pintarFormularioIngreso(panel, opciones);
    };

    for (const b of document.querySelectorAll('.conmutador-opcion')) {
      b.addEventListener('click', () => mostrar(b.dataset.pestana));
    }
    mostrar(opciones.registro_publico ? pestana : 'ingresar');
  },

  pintarFormularioIngreso(panel, opciones) {
    panel.innerHTML = `
      <h1>Iniciar sesión</h1>
      <p class="tenue pequeno">Ingrese con su cuenta de administrador, analista o cliente.</p>

      <form id="form-login" style="margin-top:1.2rem">
        <div class="campo">
          <label for="login-email">Correo electrónico <span class="req">*</span></label>
          <input id="login-email" name="email" type="email" autocomplete="username"
                 placeholder="usuario@organizacion.com" required>
        </div>
        <div class="campo">
          <label for="login-password">Contraseña <span class="req">*</span></label>
          <input id="login-password" name="password" type="password"
                 autocomplete="current-password" placeholder="••••••••" required>
        </div>
        <button class="btn btn-bloque" type="submit" id="btn-login">Ingresar</button>
      </form>

      ${opciones.demo_disponible ? `
        <div style="margin-top:1.5rem">
          <div class="seccion-etiqueta" style="font-size:.7rem">Cuentas de demostración</div>
          <div class="roles-demo">
            ${[
          ['administrador', 'admin@biocaps.ec', 'configura límites y usuarios'],
          ['analista', 'analista@biocaps.ec', 'registra muestreos y emite reportes'],
          ['cliente', 'cliente@emapasd.gob.ec', 'consulta sus propios proyectos'],
        ].map(([rol, email, detalle]) => `
              <button class="rol-demo" type="button" data-email="${email}">
                <span class="rol-demo-icono">${BC.icono(BC.iconoRol(rol), { tam: 15 })}</span>
                <span>
                  <b style="text-transform:capitalize">${rol}</b>
                  <span>${email} · ${detalle}</span>
                </span>
              </button>`).join('')}
          </div>
          <p class="ayuda">Contraseña para las tres cuentas: <b class="mono">biocaps2026</b></p>
        </div>` : ''}`;

    const form = document.getElementById('form-login');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const boton = document.getElementById('btn-login');
      const email = form.email.value.trim();
      const password = form.password.value;
      if (!email || !password) return BC.notificar('Ingrese su correo y contraseña.', 'error');

      boton.disabled = true;
      boton.textContent = 'Verificando…';
      try {
        const usuario = await BC.sesion.iniciar(email, password);
        BC.exito(`Bienvenido/a, ${usuario.nombre}`);
        location.hash = '#/dashboard';
        await this.pintarArmazon();
      } catch (e) {
        BC.error(e);
        boton.disabled = false;
        boton.textContent = 'Ingresar';
      }
    });

    for (const btn of panel.querySelectorAll('.rol-demo')) {
      btn.addEventListener('click', () => {
        form.email.value = btn.dataset.email;
        form.password.value = 'biocaps2026';
        form.password.focus();
      });
    }
  },

  pintarFormularioRegistro(panel, opciones) {
    panel.innerHTML = `
      <h1>Crear cuenta</h1>
      <p class="tenue pequeno">
        Registre su organización para consultar sus proyectos, análisis y reportes.
        ${opciones.requiere_aprobacion
        ? 'Un administrador de BioCaps revisará la solicitud antes de habilitar el acceso.'
        : 'El acceso queda habilitado de inmediato.'}
      </p>

      <form id="form-registro" style="margin-top:1.2rem">
        <div class="campo">
          <label for="reg-organizacion">Organización <span class="req">*</span></label>
          <input id="reg-organizacion" name="organizacion" required
                 placeholder="Nombre de la empresa, municipio o institución">
        </div>

        <div class="campo">
          <label for="reg-tipo">Tipo de organización <span class="req">*</span></label>
          <select id="reg-tipo" name="tipo" required>
            <option value="">— Seleccione —</option>
            ${opciones.tipos_cliente.map((t) => `<option value="${BC.esc(t)}">${BC.esc(t)}</option>`).join('')}
          </select>
        </div>

        <div class="campos" style="gap:.85rem .8rem">
          <div class="campo" style="margin:0">
            <label for="reg-nombre">Su nombre <span class="req">*</span></label>
            <input id="reg-nombre" name="nombre" required autocomplete="name" placeholder="Nombre y apellido">
          </div>
          <div class="campo" style="margin:0">
            <label for="reg-cargo">Cargo</label>
            <input id="reg-cargo" name="cargo" autocomplete="organization-title" placeholder="Opcional">
          </div>
        </div>

        <div class="campo" style="margin-top:.85rem">
          <label for="reg-email">Correo electrónico <span class="req">*</span></label>
          <input id="reg-email" name="email" type="email" required autocomplete="email"
                 placeholder="usted@organizacion.com">
        </div>

        <div class="campos" style="gap:.85rem .8rem">
          <div class="campo" style="margin:0">
            <label for="reg-telefono">Teléfono</label>
            <input id="reg-telefono" name="telefono" autocomplete="tel" placeholder="Opcional">
          </div>
          <div class="campo" style="margin:0">
            <label for="reg-ciudad">Ciudad</label>
            <input id="reg-ciudad" name="ciudad" placeholder="Opcional">
          </div>
        </div>

        <div class="campo" style="margin-top:.85rem">
          <label for="reg-password">Contraseña <span class="req">*</span></label>
          <input id="reg-password" name="password" type="password" required autocomplete="new-password"
                 placeholder="••••••••" minlength="${opciones.password_minimo}">
          <div class="ayuda">Mínimo ${opciones.password_minimo} caracteres.</div>
        </div>

        <div class="campo">
          <label for="reg-password2">Repita la contraseña <span class="req">*</span></label>
          <input id="reg-password2" name="password2" type="password" required autocomplete="new-password"
                 placeholder="••••••••">
        </div>

        <button class="btn btn-bloque" type="submit" id="btn-registro">Crear cuenta</button>
      </form>

      <div class="aviso aviso-info" style="margin-top:1.2rem">
        <span class="aviso-icono">${BC.icono('candado', { tam: 17 })}</span>
        <div class="aviso-cuerpo pequeno">
          Las cuentas creadas aquí tienen rol <b>cliente</b>: sólo consultan los datos de su
          propia organización. Los perfiles de analista y administrador los asigna BioCaps.
        </div>
      </div>`;

    const form = document.getElementById('form-registro');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const boton = document.getElementById('btn-registro');

      if (form.password.value !== form.password2.value) {
        form.password2.focus();
        return BC.notificar('Las contraseñas no coinciden.', 'error');
      }
      if (form.password.value.length < opciones.password_minimo) {
        form.password.focus();
        return BC.notificar(`La contraseña debe tener al menos ${opciones.password_minimo} caracteres.`, 'error');
      }
      if (!BC.validarFormulario(form)) return;

      const datos = BC.leerFormulario(form);
      delete datos.password2;

      boton.disabled = true;
      boton.textContent = 'Creando cuenta…';
      try {
        const r = await BC.api('/auth/registro', { method: 'POST', cuerpo: datos });
        if (r.pendiente) {
          panel.innerHTML = `
            <div class="tarjeta centrado">
              <span class="icono-caja" style="margin:0 auto .9rem">${BC.icono('reloj-arena', { tam: 20 })}</span>
              <h2 style="font-size:1.2rem">Solicitud recibida</h2>
              <p class="pequeno tenue" style="margin-bottom:0">${BC.esc(r.mensaje)}</p>
            </div>`;
          return;
        }
        localStorage.setItem('biocaps_token', r.token);
        BC.sesion.usuario = r.usuario;
        BC.exito(`Cuenta creada. Bienvenido/a, ${r.usuario.nombre}`);
        location.hash = '#/dashboard';
        await this.pintarArmazon();
      } catch (e) {
        BC.error(e);
        boton.disabled = false;
        boton.textContent = 'Crear cuenta';
      }
    });
  },

  /* ------------------------------ Armazón ------------------------------ */

  menu() {
    const rol = BC.sesion.usuario?.rol;
    const grupos = [
      {
        titulo: 'Monitoreo',
        enlaces: [
          { ruta: 'dashboard', icono: 'panel', texto: 'Dashboard' },
          { ruta: 'proyectos', icono: 'planta', texto: 'Proyectos', contador: 'proyectos' },
          { ruta: 'analisis', icono: 'matraz', texto: 'Análisis de agua', contador: 'muestreos' },
        ],
      },
      {
        titulo: 'Registros',
        enlaces: [
          { ruta: 'clientes', icono: 'edificio', texto: 'Clientes', contador: 'clientes' },
          { ruta: 'biocapsulas', icono: 'capsula', texto: 'Biocápsulas', contador: 'lotes' },
          { ruta: 'consorcios', icono: 'microbio', texto: 'Consorcios' },
        ],
      },
      {
        titulo: 'Documentación',
        enlaces: [
          { ruta: 'reportes', icono: 'documento', texto: 'Reportes PDF', contador: 'reportes' },
          { ruta: 'historial', icono: 'reloj', texto: 'Histórico' },
        ],
      },
      {
        titulo: 'Configuración',
        soloAdmin: true,
        enlaces: [
          { ruta: 'parametros', icono: 'ajustes', texto: 'Límites y parámetros' },
          { ruta: 'usuarios', icono: 'equipo', texto: 'Usuarios' },
        ],
      },
    ];

    return grupos
      .filter((g) => !g.soloAdmin || rol === 'administrador')
      .map((g) => `
        <div class="nav-grupo">${g.titulo}</div>
        ${g.enlaces.map((e) => `
          <a class="nav-enlace" href="#/${e.ruta}" data-ruta="${e.ruta}">
            <span class="nav-icono">${BC.icono(e.icono, { tam: 17 })}</span>
            <span>${e.texto}</span>
            ${e.contador ? `<span class="nav-contador" data-contador="${e.contador}"></span>` : ''}
          </a>`).join('')}`)
      .join('');
  },

  async pintarArmazon() {
    const u = BC.sesion.usuario;
    const iniciales = (u.nombre || '?').split(' ')
      .filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'BC';

    this.raiz.innerHTML = `
      <div class="armazon">
        <aside class="lateral" id="lateral">
          <div class="lateral-marca">
            <a class="marca" href="#/dashboard">
              <img src="/assets/LogoBiocaps.png" alt="">
              <span class="marca-texto">
                <span class="marca-nombre">BioCaps Monitor<sup>®</sup></span>
                <span class="marca-sub">${BC.esc(u.rol)}</span>
              </span>
            </a>
          </div>

          <nav class="lateral-nav" id="nav">${this.menu()}</nav>

          <div class="lateral-pie">
            <div class="usuario-caja">
              <div class="avatar">${BC.esc(iniciales)}</div>
              <div class="crece">
                <div class="usuario-nombre">${BC.esc(u.nombre)}</div>
                <div class="usuario-rol">${BC.esc(u.rol)}${u.cliente_nombre ? ` · ${BC.esc(u.cliente_nombre)}` : ''}</div>
              </div>
            </div>
            <div class="fila">
              <button class="btn btn-fantasma btn-sm crece" id="btn-clave" type="button">
                ${BC.icono('llave', { tam: 14 })} Clave
              </button>
              <button class="btn btn-fantasma btn-sm crece" id="btn-salir" type="button">
                ${BC.icono('salir', { tam: 14 })} Salir
              </button>
            </div>
          </div>
        </aside>

        <main class="contenido">
          <header class="barra-superior">
            <button class="menu-movil" id="btn-menu" type="button" aria-label="Menú">
              ${BC.icono('menu', { tam: 18 })}
            </button>
            <div class="barra-titulo" id="barra-titulo"></div>
            <div class="barra-acciones" id="barra-acciones"></div>
          </header>
          <div class="vista" id="vista">${BC.cargando()}</div>
        </main>
      </div>`;

    document.getElementById('btn-salir').addEventListener('click', async () => {
      await BC.sesion.cerrar();
      this.pintarLogin();
    });
    document.getElementById('btn-clave').addEventListener('click', () => this.modalClave());
    document.getElementById('btn-menu').addEventListener('click', () => {
      document.getElementById('lateral').classList.toggle('abierto');
    });

    await this.enrutar();
    this.actualizarContadores();
  },

  modalClave() {
    BC.modal.abrir({
      titulo: 'Cambiar contraseña',
      ancho: '460px',
      cuerpo: BC.formulario([
        { nombre: 'actual', etiqueta: 'Contraseña actual', tipo: 'password', requerido: true, ancho: 'completo' },
        { nombre: 'nueva', etiqueta: 'Contraseña nueva', tipo: 'password', requerido: true, ancho: 'completo', ayuda: 'Mínimo 6 caracteres.' },
      ]),
      acciones: [
        { texto: 'Cancelar', al: ({ cerrar }) => cerrar() },
        {
          texto: 'Guardar',
          clase: 'btn',
          al: async ({ cerrar, modal }) => {
            const form = modal.querySelector('form');
            if (!BC.validarFormulario(form)) return;
            try {
              await BC.api('/auth/cambiar-password', { method: 'POST', cuerpo: BC.leerFormulario(form) });
              BC.exito('Contraseña actualizada.');
              cerrar();
            } catch (e) { BC.error(e); }
          },
        },
      ],
    });
  },

  /** Contadores del menú lateral. */
  async actualizarContadores() {
    try {
      const [clientes, proyectos, muestreos, lotes, reportes] = await Promise.all([
        BC.api('/clientes'), BC.api('/proyectos'), BC.api('/muestreos'),
        BC.api('/biocapsulas'), BC.api('/reportes'),
      ]);
      this.contadores = {
        clientes: clientes.length, proyectos: proyectos.length,
        muestreos: muestreos.length, lotes: lotes.length, reportes: reportes.length,
      };
      for (const nodo of document.querySelectorAll('[data-contador]')) {
        const v = this.contadores[nodo.dataset.contador];
        nodo.textContent = v ?? '';
      }
    } catch { /* los contadores son informativos */ }
  },

  /* ------------------------------ Cabecera ------------------------------ */

  cabecera(titulo, subtitulo, acciones = '') {
    const t = document.getElementById('barra-titulo');
    const a = document.getElementById('barra-acciones');
    if (t) t.innerHTML = `<h1>${titulo}</h1>${subtitulo ? `<p>${subtitulo}</p>` : ''}`;
    if (a) a.innerHTML = acciones;
  },

  /* ------------------------------ Enrutador ------------------------------ */

  registrar(ruta, manejador) {
    this.vistas[ruta] = manejador;
  },

  async enrutar() {
    if (!BC.sesion.usuario) return this.pintarLogin();
    if (!document.getElementById('vista')) return this.pintarArmazon();

    const partes = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
    const ruta = partes[0] || 'dashboard';
    const parametros = partes.slice(1);

    for (const enlace of document.querySelectorAll('.nav-enlace')) {
      enlace.classList.toggle('activo', enlace.dataset.ruta === ruta);
    }
    document.getElementById('lateral')?.classList.remove('abierto');

    const contenedor = document.getElementById('vista');
    const manejador = this.vistas[ruta];

    if (!manejador) {
      this.cabecera('Sección no encontrada', '');
      contenedor.innerHTML = BC.vacio(`La sección "${ruta}" no existe.`, 'objetivo');
      return;
    }

    BC.graficos.destruirTodos();
    contenedor.innerHTML = BC.cargando();
    try {
      await manejador(contenedor, parametros);
    } catch (e) {
      contenedor.innerHTML = `
        <div class="aviso aviso-error">
          <span class="aviso-icono">${BC.icono('alerta', { tam: 17 })}</span>
          <div class="aviso-cuerpo">
            <div class="aviso-titulo">No se pudo cargar la sección</div>
            <div class="pequeno">${BC.esc(e.message)}</div>
          </div>
        </div>`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async iniciar() {
    this.raiz = document.getElementById('raiz');
    window.addEventListener('hashchange', () => this.enrutar());

    const usuario = await BC.sesion.cargar();
    if (!usuario) return this.pintarLogin();
    if (!location.hash) location.hash = '#/dashboard';
    await this.pintarArmazon();
  },
};

/* ---------------------- Registro de vistas ---------------------- */

BC.app.registrar('dashboard', BC.vistaDashboard);
BC.app.registrar('clientes', BC.vistaClientes);
BC.app.registrar('usuarios', BC.vistaUsuarios);
BC.app.registrar('proyectos', BC.vistaProyectos);
BC.app.registrar('proyecto', BC.vistaProyectoDetalle);
BC.app.registrar('analisis', BC.vistaAnalisis);
BC.app.registrar('muestreo', BC.vistaMuestreoDetalle);
BC.app.registrar('comparar', BC.vistaComparar);
BC.app.registrar('biocapsulas', BC.vistaBiocapsulas);
BC.app.registrar('consorcios', BC.vistaConsorcios);
BC.app.registrar('parametros', BC.vistaParametros);
BC.app.registrar('reportes', BC.vistaReportes);
BC.app.registrar('historial', BC.vistaHistorial);

BC.app.iniciar();
