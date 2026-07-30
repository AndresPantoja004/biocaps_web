/* ============================================================================
   BioCaps Monitor® — Módulo 14: Reportes técnicos en PDF

   El informe incluye: logo, información del cliente, fotografía del punto de
   muestreo, resultados, gráficos, interpretación, conclusión, cumplimiento
   normativo, firma responsable y código QR de verificación.

   Los colores del PDF provienen de la variante clara de la paleta, validada
   sobre superficie blanca; la tabla completa de resultados acompaña siempre a
   los gráficos, de modo que ningún dato dependa únicamente del color.
   ========================================================================= */

BC.reportes = (() => {
  /* Paleta para superficie blanca (impresión) */
  const C = {
    marca: [14, 107, 83],
    marcaClara: [232, 246, 241],
    antes: [235, 104, 52],
    despues: [27, 175, 122],
    azul: [42, 120, 214],
    tinta: [17, 24, 22],
    tinta2: [82, 95, 90],
    apagado: [130, 145, 140],
    linea: [222, 231, 228],
    bueno: [12, 163, 12],
    aviso: [176, 120, 8],
    critico: [208, 59, 59],
  };

  const MARGEN = 14;
  const ANCHO = 210;
  const ALTO = 297;
  const UTIL = ANCHO - MARGEN * 2;

  /* ------------------------- Texto seguro para el PDF -------------------------
     Las fuentes estándar de PDF (Helvetica) usan la codificación WinAnsi, que no
     incluye subíndices, superíndices ni los símbolos ≤ ≥ → ×. Sin esta conversión
     "DBO₅" y "≤ 100 mg/L" se imprimen como caracteres corruptos.                */

  const EQUIVALENCIAS = [
    [/[₀]/g, '0'], [/[₁]/g, '1'], [/[₂]/g, '2'], [/[₃]/g, '3'], [/[₄]/g, '4'],
    [/[₅]/g, '5'], [/[₆]/g, '6'], [/[₇]/g, '7'], [/[₈]/g, '8'], [/[₉]/g, '9'],
    [/[⁰]/g, '0'], [/[¹]/g, '1'], [/[⁴]/g, '4'], [/[⁵]/g, '5'], [/[⁶]/g, '6'],
    [/[⁷]/g, '7'], [/[⁸]/g, '8'], [/[⁹]/g, '9'],
    [/⁺/g, '+'], [/⁻/g, '-'],
    [/≤/g, '<='], [/≥/g, '>='], [/≈/g, '~'], [/≠/g, '!='],
    [/[−–—]/g, '-'],
    [/[→⇒]/g, '->'], [/[←]/g, '<-'],
    [/×/g, 'x'], [/÷/g, '/'],
    [/[“”«»]/g, '"'], [/[‘’]/g, "'"], [/…/g, '...'],
    [/[✓✔]/g, 'OK'], [/[✕✗✘]/g, 'X'], [/[⚠]/g, '!'],
    [/ /g, ' '],
  ];

  function sanear(texto) {
    if (texto === null || texto === undefined) return '';
    let s = String(texto);
    for (const [patron, reemplazo] of EQUIVALENCIAS) s = s.replace(patron, reemplazo);
    // Cualquier carácter fuera de Latin-1 se descarta antes que corromper la salida.
    return s.replace(/[^\x00-\xFF]/g, '');
  }

  const sanearFilas = (filas) => filas.map((f) => f.map(sanear));

  /** Formatea magnitudes grandes de forma legible en texto plano. */
  function magnitud(v, decimales = 2) {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
    const n = Number(v);
    if (Math.abs(n) >= 1e4) {
      const exponente = Math.floor(Math.log10(Math.abs(n)));
      const mantisa = n / 10 ** exponente;
      return `${mantisa.toFixed(2)} x 10^${exponente}`;
    }
    return n.toFixed(decimales);
  }

  /* ------------------------- Utilidades de imagen ------------------------- */

  /** Convierte una imagen del mismo origen (SVG o bitmap) en PNG data URL. */
  function aPNG(url, ancho = 220, alto = 220) {
    return new Promise((resolver) => {
      const img = new Image();
      img.onload = () => {
        try {
          const lienzo = document.createElement('canvas');
          const proporcion = img.naturalWidth && img.naturalHeight
            ? img.naturalHeight / img.naturalWidth : 1;
          lienzo.width = ancho;
          lienzo.height = Math.round(ancho * proporcion) || alto;
          const ctx = lienzo.getContext('2d');
          ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
          resolver({ datos: lienzo.toDataURL('image/png'), ancho: lienzo.width, alto: lienzo.height });
        } catch {
          resolver(null);
        }
      };
      img.onerror = () => resolver(null);
      img.src = url;
    });
  }

  /* --------------------------- Piezas del informe --------------------------- */

  function cabecera(doc, logo, reporte, primeraPagina) {
    const altoBanda = primeraPagina ? 30 : 16;
    doc.setFillColor(...C.marca);
    doc.rect(0, 0, ANCHO, altoBanda, 'F');

    // El logotipo se encaja dentro de un cuadrado conservando su proporción:
    // una imagen vertical estirada a la fuerza se vería deformada en el informe.
    let anchoLogo = 0;
    if (logo) {
      const lado = primeraPagina ? 19 : 10;
      const proporcion = logo.ancho / logo.alto;
      const alto = proporcion >= 1 ? lado / proporcion : lado;
      anchoLogo = proporcion >= 1 ? lado : lado * proporcion;
      doc.addImage(
        logo.datos, 'PNG',
        MARGEN + (lado - anchoLogo) / 2, (altoBanda - alto) / 2,
        anchoLogo, alto,
      );
    }

    const x = MARGEN + (primeraPagina ? 24 : 14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(primeraPagina ? 16 : 10);
    doc.text('BioCaps Monitor®', x, primeraPagina ? 14 : 10.5);

    if (primeraPagina) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Plataforma de monitoreo de tratamiento de aguas residuales con biocápsulas', x, 19.5);
      doc.text('Santo Domingo de los Tsáchilas, Ecuador  ·  contacto@biocaps.ec', x, 24);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(reporte.codigo, ANCHO - MARGEN, 14, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('INFORME TÉCNICO', ANCHO - MARGEN, 19.5, { align: 'right' });
      doc.text(String(reporte.created_at || '').slice(0, 19), ANCHO - MARGEN, 24, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${reporte.codigo}`, ANCHO - MARGEN, 10.5, { align: 'right' });
    }
    return altoBanda;
  }

  function pie(doc, reporte) {
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(...C.linea);
      doc.setLineWidth(0.3);
      doc.line(MARGEN, ALTO - 12, ANCHO - MARGEN, ALTO - 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...C.apagado);
      doc.text(
        `BioCaps Monitor®  ·  Informe ${reporte.codigo}  ·  Verifique la autenticidad en ${reporte.url_verificacion}`,
        MARGEN, ALTO - 8,
      );
      doc.text(`Página ${i} de ${total}`, ANCHO - MARGEN, ALTO - 8, { align: 'right' });
    }
  }

  function tituloSeccion(doc, y, numero, texto) {
    doc.setFillColor(...C.marcaClara);
    doc.rect(MARGEN, y - 4.6, UTIL, 7.4, 'F');
    doc.setFillColor(...C.marca);
    doc.rect(MARGEN, y - 4.6, 1.6, 7.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.6);
    doc.setTextColor(...C.marca);
    doc.text(`${numero}.  ${texto.toUpperCase()}`, MARGEN + 4, y);
    return y + 7.5;
  }

  /** Pares etiqueta/valor en columnas; el valor admite hasta dos líneas. */
  function bloqueDatos(doc, y, datos, columnas = 2) {
    const anchoCol = UTIL / columnas;
    const altoFila = 12.6;
    let fila = 0;

    datos.forEach((d, i) => {
      const col = i % columnas;
      if (col === 0 && i > 0) fila++;
      const x = MARGEN + col * anchoCol;
      const yFila = y + fila * altoFila;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.6);
      doc.setTextColor(...C.apagado);
      doc.text(String(d[0]).toUpperCase(), x, yFila);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.4);
      doc.setTextColor(...C.tinta);
      const lineas = doc.splitTextToSize(String(d[1] ?? '—') || '—', anchoCol - 4).slice(0, 2);
      doc.text(lineas, x, yFila + 4.1);
    });

    return y + (fila + 1) * altoFila + 1;
  }

  function parrafo(doc, y, texto, { tamano = 8.6, color = C.tinta2, interlineado = 4.3 } = {}) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(tamano);
    doc.setTextColor(...color);
    const lineas = doc.splitTextToSize(texto, UTIL);
    doc.text(lineas, MARGEN, y);
    return y + lineas.length * interlineado;
  }

  function nuevaPaginaSiHaceFalta(doc, y, necesario, logo, reporte) {
    if (y + necesario < ALTO - 16) return y;
    doc.addPage();
    return cabecera(doc, logo, reporte, false) + 8;
  }

  /* ---------------------------- Documento completo ---------------------------- */

  async function construir({ reporte, analisis, graficos = {} }) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    // Todo el texto pasa por el saneador antes de escribirse o medirse.
    const escribir = doc.text.bind(doc);
    doc.text = (texto, ...resto) => escribir(
      Array.isArray(texto) ? texto.map(sanear) : sanear(texto), ...resto,
    );
    const dividir = doc.splitTextToSize.bind(doc);
    doc.splitTextToSize = (texto, ...resto) => dividir(sanear(texto), ...resto);

    const logo = await aPNG('/assets/LogoBiocaps.png', 240);
    const p = analisis.proyecto;
    const r = analisis.resumen;

    let y = cabecera(doc, logo, reporte, true) + 10;

    /* ----------------------------- Título ----------------------------- */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    doc.setTextColor(...C.tinta);
    const titulo = doc.splitTextToSize(reporte.titulo || `Informe técnico — ${p.nombre}`, UTIL);
    doc.text(titulo, MARGEN, y);
    y += titulo.length * 6.2 + 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(...C.tinta2);
    doc.text(
      `Evaluación de la eficiencia del tratamiento biológico con biocápsulas de alginato · `
      + `${analisis.antes.codigo} (antes) vs ${analisis.despues.codigo} (después)`,
      MARGEN, y,
    );
    y += 8;

    /* --------------------- Resumen ejecutivo (indicadores) --------------------- */
    const indicadores = [
      ['Remoción promedio', r.reduccion_promedio === null ? '—' : `${r.reduccion_promedio.toFixed(1)} %`, C.despues],
      ['Cumplimiento normativo', r.cumplimiento_pct === null ? '—' : `${r.cumplimiento_pct.toFixed(0)} %`,
        r.cumplimiento_pct === 100 ? C.bueno : r.cumplimiento_pct >= 70 ? C.aviso : C.critico],
      ['Calidad del agua', r.calidad_despues.etiqueta, C.azul],
      ['ICA BioCaps', `${r.ica_antes === null ? '-' : r.ica_antes.toFixed(0)} a ${r.ica_despues === null ? '-' : r.ica_despues.toFixed(0)}`, C.marca],
    ];
    const anchoTarjeta = (UTIL - 3 * 3) / 4;
    indicadores.forEach(([etiqueta, valor, color], i) => {
      const x = MARGEN + i * (anchoTarjeta + 3);
      doc.setFillColor(250, 251, 250);
      doc.setDrawColor(...C.linea);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, anchoTarjeta, 17, 1.6, 1.6, 'FD');
      doc.setFillColor(...color);
      doc.rect(x, y, anchoTarjeta, 1.1, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(...C.apagado);
      doc.text(doc.splitTextToSize(etiqueta.toUpperCase(), anchoTarjeta - 4)[0], x + 2.4, y + 5.6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...color);
      doc.text(String(valor), x + 2.4, y + 13);
    });
    y += 23;

    /* ------------------- 1. Información del cliente ------------------- */
    y = tituloSeccion(doc, y, 1, 'Información del cliente y del proyecto');
    y = bloqueDatos(doc, y, [
      ['Cliente', p.cliente_nombre],
      ['Tipo de cliente', p.cliente_tipo],
      ['Persona de contacto', p.cliente_contacto || '—'],
      ['Correo / teléfono', `${p.cliente_correo || '—'}  ${p.cliente_telefono || ''}`.trim()],
      ['Dirección', p.cliente_direccion || '—'],
      ['Ciudad', p.cliente_ciudad || '—'],
      ['Proyecto', `${p.codigo ? `${p.codigo} · ` : ''}${p.nombre}`],
      ['Tipo de agua residual', p.tipo_agua],
      ['Ubicación de la planta', p.ubicacion || '—'],
      ['Caudal de diseño', p.caudal_m3_dia ? `${p.caudal_m3_dia} m³/día` : '—'],
      ['Estado del proyecto', p.estado],
      ['Coordenadas', p.latitud && p.longitud ? `${p.latitud}, ${p.longitud}` : '—'],
    ], 3);
    y += 3;

    /* ---------------- 2. Muestreos y tratamiento aplicado ---------------- */
    y = nuevaPaginaSiHaceFalta(doc, y, 60, logo, reporte);
    y = tituloSeccion(doc, y, 2, 'Muestreos comparados y tratamiento aplicado');

    const a = analisis.antes;
    const d = analisis.despues;
    doc.autoTable({
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      head: sanearFilas([['', 'Antes del tratamiento', 'Después del tratamiento']]),
      body: sanearFilas([
        ['Código de muestra', a.codigo, d.codigo],
        ['Fecha / hora', `${a.fecha_muestreo} ${a.hora || ''}`.trim(), `${d.fecha_muestreo} ${d.hora || ''}`.trim()],
        ['Punto de muestreo', `${a.punto_codigo || '—'} ${a.punto_nombre ? `· ${a.punto_nombre}` : ''}`.trim(),
          `${d.punto_codigo || '—'} ${d.punto_nombre ? `· ${d.punto_nombre}` : ''}`.trim()],
        ['Responsable', a.responsable || '—', d.responsable || '—'],
        ['Laboratorio', a.laboratorio || '—', d.laboratorio || '—'],
        ['Lote de biocápsulas', a.biocapsula_lote || 'no aplica', d.biocapsula_lote || '—'],
        ['Consorcio bacteriano', a.consorcio_nombre || 'no aplica', d.consorcio_nombre || '—'],
        ['Concentración bacteriana', a.concentracion_ufc_ml ? `${magnitud(a.concentracion_ufc_ml)} UFC/mL` : 'no aplica',
          d.concentracion_ufc_ml ? `${magnitud(d.concentracion_ufc_ml)} UFC/mL` : '—'],
        ['Dosis aplicada', a.dosis_capsulas ? `${a.dosis_capsulas} cápsulas` : 'no aplica',
          d.dosis_capsulas ? `${d.dosis_capsulas} cápsulas` : '—'],
        ['Tiempo de retención', a.tiempo_retencion_h ? `${a.tiempo_retencion_h} h` : 'no aplica',
          d.tiempo_retencion_h ? `${d.tiempo_retencion_h} h` : '—'],
      ]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.6, cellPadding: 1.7, textColor: C.tinta2, lineColor: C.linea, lineWidth: 0.2 },
      headStyles: { fillColor: C.marca, textColor: [255, 255, 255], fontSize: 7.8, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: C.tinta, cellWidth: 42, fillColor: [248, 250, 249] },
        1: { cellWidth: (UTIL - 42) / 2 },
        2: { cellWidth: (UTIL - 42) / 2 },
      },
    });
    y = doc.lastAutoTable.finalY + 6;

    /* -------------------- 3. Fotografía del punto -------------------- */
    const rutaFoto = d.punto_fotografia || a.punto_fotografia;
    if (rutaFoto) {
      const foto = await aPNG(rutaFoto, 640);
      if (foto) {
        const anchoFoto = 78;
        const altoFoto = Math.min(56, (anchoFoto * foto.alto) / foto.ancho);
        y = nuevaPaginaSiHaceFalta(doc, y, altoFoto + 20, logo, reporte);
        y = tituloSeccion(doc, y, 3, 'Fotografía del punto de muestreo');
        doc.addImage(foto.datos, 'PNG', MARGEN, y, anchoFoto, altoFoto);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.6);
        doc.setTextColor(...C.tinta2);
        const pie2 = doc.splitTextToSize(
          `${d.punto_codigo || ''} ${d.punto_nombre || ''}\n${p.ubicacion || ''}`.trim(),
          UTIL - anchoFoto - 6,
        );
        doc.text(pie2, MARGEN + anchoFoto + 6, y + 5);
        y += altoFoto + 6;
      }
    }

    /* --------------------- 4. Resultados de laboratorio --------------------- */
    const numeroResultados = rutaFoto ? 4 : 3;
    y = nuevaPaginaSiHaceFalta(doc, y, 70, logo, reporte);
    y = tituloSeccion(doc, y, numeroResultados, 'Resultados de los análisis y eficiencia de remoción');

    const emoji = { excelente: 'Excelente', aceptable: 'Aceptable', critico: 'Critico', sin_dato: '-' };
    const cuerpo = analisis.parametros
      .filter((x) => x.valor_antes !== null || x.valor_despues !== null || x.texto_antes || x.texto_despues)
      .map((x) => {
        const val = (v, t) => {
          if (t) return t;
          if (v === null) return '—';
          return magnitud(v, 2);
        };
        return [
          `${x.simbolo}`,
          x.unidad || '',
          val(x.valor_antes, x.texto_antes),
          val(x.valor_despues, x.texto_despues),
          x.reduccion === null ? '—' : `${x.reduccion.toFixed(1)} %`,
          x.normativa || '—',
          emoji[x.nivel_despues.clave] || '-',
          x.cumple_despues === null ? 'n/a' : x.cumple_despues ? 'Sí' : 'No',
        ];
      });

    doc.autoTable({
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      head: sanearFilas([['Parámetro', 'Unidad', 'Antes', 'Después', 'Remoción', 'Límite de referencia', 'Estado', 'Cumple']]),
      body: sanearFilas(cuerpo),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 7.2, cellPadding: 1.5, textColor: C.tinta2, lineColor: C.linea, lineWidth: 0.15 },
      headStyles: { fillColor: C.marca, textColor: [255, 255, 255], fontSize: 7.2, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 251, 250] },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: C.tinta, cellWidth: 24 },
        1: { cellWidth: 16 },
        2: { halign: 'right', cellWidth: 19 },
        3: { halign: 'right', cellWidth: 19, fontStyle: 'bold', textColor: C.tinta },
        4: { halign: 'right', cellWidth: 19 },
        5: { fontSize: 6.4 },
        6: { cellWidth: 17, fontSize: 6.6 },
        7: { cellWidth: 14, halign: 'center' },
      },
      didParseCell: (datos) => {
        if (datos.section !== 'body') return;
        if (datos.column.index === 6) {
          const estado = datos.cell.raw;
          datos.cell.styles.textColor = estado === 'Excelente' ? C.bueno
            : estado === 'Aceptable' ? C.aviso
              : estado === 'Critico' ? C.critico : C.apagado;
          datos.cell.styles.fontStyle = 'bold';
        }
        if (datos.column.index === 7) {
          datos.cell.styles.textColor = datos.cell.raw === 'Sí' ? C.bueno
            : datos.cell.raw === 'No' ? C.critico : C.apagado;
          datos.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = doc.lastAutoTable.finalY + 4;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(...C.apagado);
    doc.text(
      'Remoción calculada como (Inicial − Final) / Inicial × 100.  Estado: Excelente / Aceptable / Crítico según los límites configurados en la plataforma.',
      MARGEN, y,
    );
    y += 7;

    /* --------------------------- 5. Gráficos --------------------------- */
    const imagenes = [
      ['Concentraciones antes y después del tratamiento (mg/L)', graficos.barras],
      ['Porcentaje de remoción por parámetro', graficos.remocion],
      ['Sub-índice de calidad por parámetro (100 = calidad óptima)', graficos.radar],
      ['Evolución mensual del proyecto (mg/L)', graficos.evolucion],
    ].filter(([, img]) => img);

    if (imagenes.length) {
      doc.addPage();
      y = cabecera(doc, logo, reporte, false) + 10;
      y = tituloSeccion(doc, y, numeroResultados + 1, 'Representación gráfica de los resultados');

      const anchoImg = (UTIL - 5) / 2;
      const altoImg = anchoImg * 0.62;
      imagenes.forEach(([leyenda, img], i) => {
        const col = i % 2;
        const filaImg = Math.floor(i / 2);
        const x = MARGEN + col * (anchoImg + 5);
        const yImg = y + filaImg * (altoImg + 13);

        doc.setFillColor(252, 253, 252);
        doc.setDrawColor(...C.linea);
        doc.roundedRect(x, yImg, anchoImg, altoImg + 8, 1.4, 1.4, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(...C.tinta);
        doc.text(doc.splitTextToSize(leyenda, anchoImg - 4), x + 2, yImg + 4);
        doc.addImage(img, 'PNG', x + 1.5, yImg + 6.5, anchoImg - 3, altoImg);
      });
      y += Math.ceil(imagenes.length / 2) * (altoImg + 13) + 2;
    }

    /* ------------ 6. Interpretación e inteligencia del software ------------ */
    const numeroInterpretacion = numeroResultados + (imagenes.length ? 2 : 1);
    y = nuevaPaginaSiHaceFalta(doc, y, 70, logo, reporte);
    y = tituloSeccion(doc, y, numeroInterpretacion, 'Interpretación técnica');
    y = parrafo(doc, y, analisis.interpretacion);
    y += 4;

    if (analisis.inteligencia?.length) {
      for (const m of analisis.inteligencia) {
        y = nuevaPaginaSiHaceFalta(doc, y, 18, logo, reporte);
        const color = m.tipo === 'exito' ? C.bueno : m.tipo === 'alerta' ? C.critico : C.azul;

        // El distintivo se dibuja con trazos: los glifos ✓ y ⚠ no existen en las
        // fuentes estándar del PDF y se imprimirían corruptos.
        doc.setFillColor(...color);
        doc.circle(MARGEN + 2, y - 1, 1.9, 'F');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.45);
        if (m.tipo === 'exito') {
          doc.line(MARGEN + 1.1, y - 1.05, MARGEN + 1.75, y - 0.35);
          doc.line(MARGEN + 1.75, y - 0.35, MARGEN + 3, y - 1.85);
        } else if (m.tipo === 'alerta') {
          doc.line(MARGEN + 2, y - 2, MARGEN + 2, y - 0.9);
          doc.circle(MARGEN + 2, y - 0.25, 0.22, 'F');
        } else {
          doc.circle(MARGEN + 2, y - 1.9, 0.22, 'F');
          doc.line(MARGEN + 2, y - 1.35, MARGEN + 2, y - 0.15);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(...C.tinta);
        doc.text(m.titulo, MARGEN + 6, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(...C.tinta2);
        const lineas = doc.splitTextToSize(m.texto, UTIL - 6);
        doc.text(lineas, MARGEN + 6, y + 3.9);
        y += 4.6 + lineas.length * 3.7 + 2.4;
      }
      y += 2;
    }

    /* ------------------- 7. Cumplimiento normativo ------------------- */
    y = nuevaPaginaSiHaceFalta(doc, y, 40, logo, reporte);
    y = tituloSeccion(doc, y, numeroInterpretacion + 1, 'Cumplimiento normativo');

    const cumple = r.cumplimiento_pct === 100;
    const colorCumple = cumple ? C.bueno : r.cumplimiento_pct >= 70 ? C.aviso : C.critico;

    const titularCumple = cumple
      ? 'EL EFLUENTE TRATADO CUMPLE LA TOTALIDAD DE LOS LÍMITES MÁXIMOS PERMISIBLES'
      : `CUMPLIMIENTO PARCIAL: ${r.parametros_cumplen} DE ${r.parametros_evaluados} PARÁMETROS DENTRO DEL LÍMITE`;
    const detalleCumple = cumple
      ? 'Referencia: TULSMA — Acuerdo Ministerial 097-A, Anexo 1, Tabla 9 (descarga a cuerpo de agua dulce), y los límites configurados en la plataforma.'
      : `Parámetros fuera de norma: ${r.no_cumplen.join(', ')}. Referencia: TULSMA — Acuerdo Ministerial 097-A, Anexo 1, Tabla 9.`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    const lineasTitular = doc.splitTextToSize(titularCumple, UTIL - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    const lineasDetalle = doc.splitTextToSize(detalleCumple, UTIL - 8);
    const altoCaja = 8 + lineasTitular.length * 4.4 + lineasDetalle.length * 3.7 + 6;

    y = nuevaPaginaSiHaceFalta(doc, y, altoCaja + 6, logo, reporte);
    doc.setFillColor(cumple ? 240 : 253, cumple ? 250 : 248, cumple ? 242 : 240);
    doc.setDrawColor(...colorCumple);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGEN, y - 3, UTIL, altoCaja, 1.8, 1.8, 'FD');

    let yCaja = y + 2.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(...colorCumple);
    doc.text(lineasTitular, MARGEN + 4, yCaja);
    yCaja += lineasTitular.length * 4.4 + 1.4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...C.tinta2);
    doc.text(lineasDetalle, MARGEN + 4, yCaja);
    yCaja += lineasDetalle.length * 3.7 + 1.6;

    doc.setFontSize(7.4);
    doc.setTextColor(...C.tinta);
    doc.text(
      `Semáforo del efluente:  Excelente ${r.semaforo.excelente}  ·  Aceptable ${r.semaforo.aceptable}  ·  Crítico ${r.semaforo.critico}`,
      MARGEN + 4, yCaja,
    );
    y += altoCaja + 5;

    /* --------------------------- 8. Conclusión --------------------------- */
    y = nuevaPaginaSiHaceFalta(doc, y, 40, logo, reporte);
    y = tituloSeccion(doc, y, numeroInterpretacion + 2, 'Conclusión y recomendaciones');
    y = parrafo(doc, y, analisis.conclusion, { tamano: 8.8 });
    y += 8;

    /* ----------------------- 9. Firma y código QR ----------------------- */
    y = nuevaPaginaSiHaceFalta(doc, y, 52, logo, reporte);

    doc.setDrawColor(...C.linea);
    doc.setLineWidth(0.3);
    doc.line(MARGEN, y, MARGEN + 74, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.tinta);
    doc.text(reporte.firma_nombre || '', MARGEN, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...C.tinta2);
    doc.text(reporte.firma_cargo || '', MARGEN, y + 9.6);
    doc.text('BioCaps Monitor® — responsable de la emisión', MARGEN, y + 14);
    doc.setFontSize(7.2);
    doc.setTextColor(...C.apagado);
    doc.text(`Emitido el ${reporte.created_at || ''}`, MARGEN, y + 18.4);

    if (reporte.qr) {
      const ladoQR = 30;
      const xQR = ANCHO - MARGEN - ladoQR;
      doc.addImage(reporte.qr, 'PNG', xQR, y - 4, ladoQR, ladoQR);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(...C.tinta);
      doc.text('VERIFICACIÓN', xQR + ladoQR / 2, y + ladoQR - 0.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...C.apagado);
      doc.text(reporte.codigo, xQR + ladoQR / 2, y + ladoQR + 3, { align: 'center' });
    }

    pie(doc, reporte);
    return doc;
  }

  /* ------------------------------ API pública ------------------------------ */

  /** Emite el reporte en el servidor y descarga el PDF. */
  async function generar({ proyecto_id, muestreo_antes_id, muestreo_despues_id, graficos }) {
    BC.notificar('Generando reporte técnico…');
    try {
      const respuesta = await BC.api('/reportes', {
        method: 'POST',
        cuerpo: { proyecto_id, muestreo_antes_id, muestreo_despues_id },
      });
      const doc = await construir({ ...respuesta, graficos });
      doc.save(`${respuesta.reporte.codigo}.pdf`);
      BC.exito(`Reporte ${respuesta.reporte.codigo} generado y registrado en el histórico.`);
      BC.app.actualizarContadores();
      return respuesta.reporte;
    } catch (e) {
      BC.error(e);
      return null;
    }
  }

  /** Reimprime un reporte ya emitido (sin volver a registrarlo). */
  async function reimprimir(id) {
    BC.notificar('Preparando el PDF…');
    try {
      const respuesta = await BC.api(`/reportes/${id}`);
      const doc = await construir({ ...respuesta, graficos: {} });
      doc.save(`${respuesta.reporte.codigo}.pdf`);
      BC.exito(`Reporte ${respuesta.reporte.codigo} descargado.`);
    } catch (e) {
      BC.error(e);
    }
  }

  return { generar, reimprimir, construir };
})();
