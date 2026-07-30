/* ============================================================================
   BioCaps Monitor® — Núcleo de la aplicación
   Cliente HTTP, formateo, notificaciones, modales y componentes reutilizables.
   ========================================================================= */

window.BC = window.BC || {};

/* ------------------------------ Cliente HTTP ------------------------------ */

BC.api = async function api(ruta, opciones = {}) {
  const config = { headers: {}, credentials: 'same-origin', ...opciones };

  if (config.cuerpo !== undefined) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.cuerpo);
    delete config.cuerpo;
  }
  const token = localStorage.getItem('biocaps_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(`/api${ruta}`, config);

  if (respuesta.status === 401 && !ruta.startsWith('/auth/login')) {
    BC.sesion.cerrarLocal();
    throw new Error('Su sesión expiró. Vuelva a iniciar sesión.');
  }

  let datos = null;
  const tipo = respuesta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos?.error || `Error ${respuesta.status} al comunicarse con el servidor.`);
  }
  return datos;
};

BC.subirArchivo = async function subirArchivo(formData) {
  const headers = {};
  const token = localStorage.getItem('biocaps_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch('/api/archivos', {
    method: 'POST', body: formData, headers, credentials: 'same-origin',
  });
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new Error(datos?.error || 'No se pudo subir el archivo.');
  return datos;
};

/* ------------------------------ Formateo ------------------------------ */

BC.esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** Número con separadores locales; devuelve el marcador si no hay dato. */
BC.num = (v, decimales = 1, marcador = '—') => {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return marcador;
  const n = Number(v);
  const d = Math.abs(n) >= 1000 ? 0 : decimales;
  return n.toLocaleString('es-EC', { minimumFractionDigits: d, maximumFractionDigits: d });
};

BC.pct = (v, decimales = 1) => (
  v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `${BC.num(v, decimales)} %`
);

/** Notación compacta para valores muy grandes (coliformes, UFC/mL). */
BC.compacto = (v) => {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${BC.num(n / 1e9, 2)} × 10⁹`;
  if (Math.abs(n) >= 1e6) return `${BC.num(n / 1e6, 2)} × 10⁶`;
  if (Math.abs(n) >= 1e4) return `${BC.num(n / 1e3, 1)} × 10³`;
  return BC.num(n, 1);
};

BC.fecha = (f, largo = false) => {
  if (!f) return '—';
  const iso = String(f).length <= 10 ? `${f}T12:00:00` : String(f).replace(' ', 'T');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(f);
  return d.toLocaleDateString('es-EC', largo
    ? { day: '2-digit', month: 'long', year: 'numeric' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
};

BC.fechaHora = (f) => {
  if (!f) return '—';
  const d = new Date(String(f).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(f);
  return d.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

BC.mesNombre = (mes) => {
  const [a, m] = String(mes).split('-');
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${nombres[Number(m) - 1] || m} ${String(a).slice(2)}`;
};

/* Insignia de semáforo: punto de color + etiqueta escrita, nunca color a secas. */
BC.estado = (nivel) => {
  if (!nivel) return '<span class="estado estado-sin_dato">Sin dato</span>';
  return `<span class="estado estado-${BC.esc(nivel.clave)}">${BC.esc(nivel.etiqueta)}</span>`;
};

BC.chipEstadoProyecto = (estado) => {
  const estilos = {
    Activo: 'chip-marca', Finalizado: '', Planificado: '', Suspendido: '',
  };
  return `<span class="chip ${estilos[estado] ?? ''}">${BC.esc(estado)}</span>`;
};

/* ---------------------------- Notificaciones ---------------------------- */

BC.notificar = function notificar(mensaje, tipo = 'info') {
  let zona = document.getElementById('notificaciones');
  if (!zona) {
    zona = document.createElement('div');
    zona.id = 'notificaciones';
    document.body.appendChild(zona);
  }
  const nodo = document.createElement('div');
  nodo.className = `notificacion notificacion-${tipo}`;
  nodo.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  nodo.innerHTML = `${BC.icono(BC.iconoAviso(tipo), { tam: 15 })} ${BC.esc(mensaje)}`;
  zona.appendChild(nodo);
  setTimeout(() => {
    nodo.style.transition = 'opacity .3s ease';
    nodo.style.opacity = '0';
    setTimeout(() => nodo.remove(), 320);
  }, 4200);
};

BC.error = (e) => BC.notificar(e?.message || String(e), 'error');
BC.exito = (m) => BC.notificar(m, 'exito');

/* -------------------------------- Modal -------------------------------- */

BC.modal = {
  abrir({ titulo, cuerpo, acciones = [], ancho }) {
    this.cerrar();
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${BC.esc(titulo)}"
           ${ancho ? `style="width:min(${ancho},100%)"` : ''}>
        <div class="modal-cabecera">
          <h3>${BC.esc(titulo)}</h3>
          <button class="cerrar" type="button" aria-label="Cerrar">×</button>
        </div>
        <div class="modal-cuerpo"></div>
        ${acciones.length ? '<div class="modal-pie"></div>' : ''}
      </div>`;

    const cuerpoNodo = fondo.querySelector('.modal-cuerpo');
    if (typeof cuerpo === 'string') cuerpoNodo.innerHTML = cuerpo;
    else cuerpoNodo.appendChild(cuerpo);

    const pie = fondo.querySelector('.modal-pie');
    for (const a of acciones) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn ${a.clase || 'btn-fantasma'}`;
      btn.textContent = a.texto;
      btn.addEventListener('click', () => a.al?.({ cerrar: () => this.cerrar(), boton: btn, modal: fondo }));
      pie.appendChild(btn);
    }

    fondo.querySelector('.cerrar').addEventListener('click', () => this.cerrar());
    fondo.addEventListener('mousedown', (ev) => { if (ev.target === fondo) this.cerrar(); });
    document.addEventListener('keydown', this._escape = (ev) => {
      if (ev.key === 'Escape') this.cerrar();
    });

    document.body.appendChild(fondo);
    this._nodo = fondo;
    fondo.querySelector('input, select, textarea, button')?.focus();
    return fondo;
  },

  cerrar() {
    this._nodo?.remove();
    this._nodo = null;
    if (this._escape) {
      document.removeEventListener('keydown', this._escape);
      this._escape = null;
    }
  },

  confirmar({ titulo = 'Confirmar', mensaje, textoAceptar = 'Aceptar', peligro = false }) {
    return new Promise((resolver) => {
      this.abrir({
        titulo,
        ancho: '480px',
        cuerpo: `<p style="margin:0">${BC.esc(mensaje)}</p>`,
        acciones: [
          { texto: 'Cancelar', al: ({ cerrar }) => { cerrar(); resolver(false); } },
          {
            texto: textoAceptar,
            clase: peligro ? 'btn-peligro' : 'btn',
            al: ({ cerrar }) => { cerrar(); resolver(true); },
          },
        ],
      });
    });
  },
};

/* ------------------------- Construcción de formularios ------------------------- */

/**
 * Genera el HTML de un formulario a partir de una definición declarativa.
 * campos: [{ nombre, etiqueta, tipo, opciones, valor, requerido, ancho, ayuda, paso, min, max }]
 */
BC.formulario = function formulario(campos, valores = {}) {
  const html = campos.map((c) => {
    if (c.tipo === 'separador') {
      return `<div class="campo-ancho" style="margin:.35rem 0 -.2rem">
                <div class="seccion-etiqueta" style="margin:0">${BC.esc(c.etiqueta)}</div>
              </div>`;
    }
    const valor = valores[c.nombre] ?? c.valor ?? '';
    const id = `campo-${c.nombre}`;
    const clase = c.ancho === 'completo' ? 'campo campo-ancho' : 'campo';
    const req = c.requerido ? ' required' : '';
    const marca = c.requerido ? ' <span class="req">*</span>' : '';

    let control;
    if (c.tipo === 'select') {
      const opciones = (c.opciones || []).map((o) => {
        const v = typeof o === 'object' ? o.valor : o;
        const t = typeof o === 'object' ? o.texto : o;
        return `<option value="${BC.esc(v)}"${String(v) === String(valor) ? ' selected' : ''}>${BC.esc(t)}</option>`;
      }).join('');
      control = `<select id="${id}" name="${c.nombre}"${req}>
                   ${c.vacio === false ? '' : `<option value="">${BC.esc(c.vacio || '— Seleccione —')}</option>`}
                   ${opciones}
                 </select>`;
    } else if (c.tipo === 'textarea') {
      control = `<textarea id="${id}" name="${c.nombre}"${req}
                   placeholder="${BC.esc(c.placeholder || '')}"
                   rows="${c.filas || 3}">${BC.esc(valor)}</textarea>`;
    } else {
      const extra = [
        c.paso !== undefined ? `step="${c.paso}"` : '',
        c.min !== undefined ? `min="${c.min}"` : '',
        c.max !== undefined ? `max="${c.max}"` : '',
      ].filter(Boolean).join(' ');
      control = `<input id="${id}" name="${c.nombre}" type="${c.tipo || 'text'}"
                   value="${BC.esc(valor)}" placeholder="${BC.esc(c.placeholder || '')}"
                   ${extra}${req}>`;
    }

    return `<div class="${clase}">
              <label for="${id}">${BC.esc(c.etiqueta)}${marca}</label>
              ${control}
              ${c.ayuda ? `<div class="ayuda">${BC.esc(c.ayuda)}</div>` : ''}
            </div>`;
  }).join('');

  return `<form class="campos" novalidate>${html}</form>`;
};

/** Lee un formulario y devuelve un objeto con sus valores (vacío → null). */
BC.leerFormulario = function leerFormulario(form) {
  const datos = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    const v = el.value.trim();
    datos[el.name] = v === '' ? null : (el.type === 'number' ? Number(v) : v);
  }
  return datos;
};

/** Valida los campos requeridos; marca el primero que falte. */
BC.validarFormulario = function validarFormulario(form) {
  for (const el of form.elements) {
    if (el.required && !el.value.trim()) {
      el.focus();
      const etiqueta = form.querySelector(`label[for="${el.id}"]`)?.textContent.replace('*', '').trim();
      BC.notificar(`Complete el campo: ${etiqueta || el.name}`, 'error');
      return false;
    }
  }
  return true;
};

/* ------------------------------ Componentes ------------------------------ */

BC.cargando = (texto = 'Cargando…') => `
  <div class="cargando"><div class="girador"></div><span>${BC.esc(texto)}</span></div>`;

BC.vacio = (texto, icono = 'caja') => `
  <div class="vacio">
    <span class="vacio-icono">${BC.icono(icono, { tam: 30, trazo: 1.4 })}</span>
    ${BC.esc(texto)}
  </div>`;

BC.indicador = ({ etiqueta, valor, unidad, pie, icono, acento, estado, compacto }) => `
  <div class="indicador" style="--acento:${acento || 'var(--brand)'}">
    ${icono ? `<span class="indicador-icono">${BC.icono(icono, { tam: 18 })}</span>` : ''}
    <div class="indicador-etiqueta">${BC.esc(etiqueta)}</div>
    <div class="indicador-valor${compacto ? ' indicador-valor-compacto' : ''}">${valor}${unidad ? `<small>${BC.esc(unidad)}</small>` : ''}</div>
    ${estado ? `<div class="indicador-pie">${BC.estado(estado)}</div>` : ''}
    ${pie ? `<div class="indicador-pie">${pie}</div>` : ''}
  </div>`;

/** Mensajes de la inteligencia del software. */
BC.avisoInteligente = (m) => {
  const clases = { exito: 'aviso-exito', alerta: 'aviso-alerta', info: 'aviso-info' };
  return `
    <div class="aviso ${clases[m.tipo] || 'aviso-info'}">
      <span class="aviso-icono">${BC.icono(BC.iconoAviso(m.tipo), { tam: 17 })}</span>
      <div class="aviso-cuerpo">
        <div class="aviso-titulo">${BC.esc(m.titulo)}</div>
        <div class="pequeno">${BC.esc(m.texto)}</div>
        ${m.parametro ? `<div class="pequeno tenue" style="margin-top:.2rem">Parámetro: ${BC.esc(m.parametro)}</div>` : ''}
      </div>
    </div>`;
};

/** Descarga un texto/blob como archivo. */
BC.descargar = (contenido, nombre, tipo = 'text/csv;charset=utf-8') => {
  const blob = contenido instanceof Blob ? contenido : new Blob(['﻿' + contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

BC.aCSV = (filas) => filas.map((f) => f.map((c) => {
  const s = String(c ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(';')).join('\n');
