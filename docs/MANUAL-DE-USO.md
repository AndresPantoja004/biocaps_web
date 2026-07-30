# BioCaps Monitor® — Manual de uso

Qué hace la plataforma, qué datos se ingresan en cada pantalla, cuál es el flujo
normal de trabajo y qué representa cada gráfico del dashboard.

**Producción:** https://biocaps.davant.dev · **Plataforma:** https://biocaps.davant.dev/app

---

## 1. Qué hace la web, en una frase

Convierte resultados de laboratorio sueltos en **evidencia de que un tratamiento de
agua funciona**: calcula sola cuánto se removió de cada contaminante, dice si el
efluente cumple la norma y emite un informe técnico verificable.

### Lo que hace exactamente

| Hace | No hace |
|---|---|
| Guarda clientes, proyectos, puntos de muestreo y análisis | Analizar el agua (eso lo hace el laboratorio) |
| Calcula el % de remoción de cada parámetro | Validar si el dato del laboratorio es correcto |
| Clasifica cada valor contra el límite legal | Controlar equipos ni sensores en tiempo real |
| Interpreta los resultados y recomienda acciones | Reemplazar el criterio del profesional |
| Genera informes PDF con código QR verificable | Facturar ni gestionar cobros |
| Muestra la evolución del tratamiento en el tiempo | |

**La idea clave:** el analista solo escribe los números que le entregó el
laboratorio. Todo lo demás —porcentajes, semáforos, gráficos, conclusiones, informe—
lo produce la plataforma automáticamente.

---

## 2. Las dos partes del sitio

### 2.1 Sitio público (`/`)

No requiere cuenta. Es la cara comercial: logo, qué es el emprendimiento, el problema
y la solución, aporte a los **6 ODS**, los servicios, cómo funciona la plataforma y
las noticias. Al final tiene el botón **Ingresar**.

### 2.2 Plataforma (`/app`)

Requiere cuenta. Dos formas de entrar:

- **Iniciar sesión** — con una cuenta existente.
- **Crear cuenta** — una organización se registra sola. Queda con rol **cliente**:
  solo consulta sus propios proyectos. Los perfiles de analista y administrador los
  crea el administrador.

---

## 3. Los tres roles

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Todo. Además: configurar los límites del semáforo y crear/aprobar usuarios. |
| **Analista** | Registrar clientes, proyectos, puntos, muestreos, biocápsulas y emitir reportes. No configura límites ni usuarios. |
| **Cliente** | Solo consultar: ve los proyectos, análisis y reportes **de su propia organización**. No puede modificar nada. |

Esta restricción se aplica en el servidor, no ocultando botones: aunque un cliente
manipulara la dirección del navegador, el servidor le niega los datos ajenos.

---

## 4. El flujo normal de trabajo

```
1. Registrar CLIENTE          ← la organización dueña de la planta
        ↓
2. Registrar PROYECTO         ← la planta o el tratamiento concreto
        ↓
3. Registrar PUNTOS de muestreo  ← dónde se toma cada muestra
        ↓
4. Registrar LOTE de biocápsulas ← qué se aplicó al agua
        ↓
5. Ingresar ANÁLISIS «antes»     ← el agua cruda (afluente)
        ↓
6. Ingresar ANÁLISIS «después»   ← el agua tratada (efluente)
        ↓
7. ANÁLISIS AUTOMÁTICO           ← la plataforma calcula sola
        ↓
8. Generar REPORTE PDF
        ↓
9. HISTÓRICO                     ← queda todo registrado
```

Los pasos 1 a 4 se hacen **una sola vez por cliente**. Lo que se repite cada mes es
del 5 en adelante.

**Regla fundamental:** los cálculos aparecen cuando existen **dos análisis del mismo
proyecto**, uno marcado «antes» y otro «después». Con uno solo, la plataforma avisa
que el análisis comparativo está incompleto.

---

## 5. Qué datos se ingresan en cada paso

### Paso 1 · Nuevo cliente

*Menú: Clientes → Registrar cliente*

| Campo | Obligatorio | Para qué sirve |
|---|:---:|---|
| **Nombre / Empresa** | **Sí** | Identifica a la organización |
| **Tipo de cliente** | **Sí** | Empresa · Municipio · Industria · Ganadería · Universidad. Alimenta el gráfico de pastel del dashboard |
| RUC / Identificación | No | Dato tributario para los informes |
| Persona de contacto | No | Aparece impresa en el reporte PDF |
| Cargo del contacto | No | Acompaña al nombre en el informe |
| Correo electrónico | No | Contacto; también en el informe |
| Teléfono | No | Contacto |
| Dirección | No | Se imprime en el PDF |
| Ciudad | No | Se imprime en el PDF |
| Provincia | No | Ubicación administrativa |
| Notas | No | Contexto interno (no sale en el informe) |

> **Recomendación:** aunque solo dos campos sean obligatorios, llena contacto, correo,
> teléfono y dirección. Son los datos que se imprimen en el reporte técnico; si faltan,
> el informe sale con guiones y se ve incompleto ante una auditoría.

### Paso 2 · Nuevo proyecto

*Menú: Proyectos → Registrar proyecto*

Un proyecto es **una planta o un tratamiento concreto**. Un mismo cliente puede tener
varios (por ejemplo, un municipio con su PTAR y su relleno sanitario).

| Campo | Obligatorio | Para qué sirve |
|---|:---:|---|
| **Nombre del proyecto** | **Sí** | Descriptivo: «PTAR Municipal — Módulo biológico» |
| **Cliente** | **Sí** | A qué organización pertenece |
| **Tipo de agua** | **Sí** | Doméstica · Industrial · Agrícola · Lixiviados. Alimenta un pastel del dashboard |
| Código | No | Si lo dejas vacío se genera solo (PRY-001, PRY-002…) |
| Estado | No | Planificado · **Activo** · Finalizado · Suspendido. Alimenta las tarjetas «tratamientos activos/finalizados» |
| Ubicación | No | Dirección de la planta; se imprime en el informe |
| **Latitud / Longitud** | No | **Sin esto el proyecto no aparece en el mapa del dashboard.** Ej.: `-0.2542` y `-79.1750` |
| Caudal (m³/día) | No | Caudal de diseño; contexto para dimensionar la dosis |
| Fecha de inicio / fin | No | Periodo del proyecto |
| Descripción | No | En qué consiste el tratamiento |

> **Cómo obtener las coordenadas:** en Google Maps, clic derecho sobre el punto → el
> primer número es la latitud y el segundo la longitud. En Ecuador ambos son negativos.

### Paso 3 · Puntos de muestreo

*Dentro del proyecto → pestaña **Puntos** → Registrar punto*

Un punto es **el lugar físico donde se toma la muestra**. Lo mínimo son dos: entrada
y salida.

| Campo | Obligatorio | Para qué sirve |
|---|:---:|---|
| **Código del punto** | **Sí** | PM-01, PM-02… Identificador corto |
| Tipo de punto | No | **Entrada** · Intermedio · **Salida** · Cuerpo receptor |
| Nombre descriptivo | No | «Afluente crudo — canal de entrada» |
| Latitud / Longitud | No | Ubica el punto dentro del mapa del proyecto |
| Descripción | No | Detalles del sitio de toma |
| **Fotografía** | No | Se sube desde el mismo formulario y **se imprime en el reporte PDF** |

> **Por qué importa el tipo:** al registrar un análisis, la plataforma preselecciona
> automáticamente el punto de *Entrada* si marcas «antes» y el de *Salida* si marcas
> «después». Ahorra errores.

### Paso 4 · Consorcios y lotes de biocápsulas

*Menú: Consorcios → Registrar consorcio* (una vez por formulación)

| Campo | Obligatorio |
|---|:---:|
| **Nombre del consorcio** | **Sí** |
| Especies bacterianas | No |
| Concentración (UFC/mL) | No |
| Función en el tratamiento | No |
| Descripción | No |

*Menú: Biocápsulas → Registrar lote* (cada producción)

| Campo | Obligatorio | Para qué sirve |
|---|:---:|---|
| **Número de lote** | **Sí** | BC-2026-001. Debe ser único |
| Consorcio bacteriano | No | Qué formulación contiene |
| **Fecha de encapsulación** | No | **Junto con la vida útil calcula la caducidad** |
| **Vida útil (días)** | No | Típicamente 90 |
| Alginato de sodio (%) | No | Formulación (típico 2 %) |
| CaCl₂ (%) | No | Agente reticulante (típico 2 %) |
| Diámetro (mm) | No | Tamaño de esfera (3–4,5 mm) |
| Número de cápsulas | No | Cuántas se produjeron |
| Peso total (g) | No | Masa del lote |
| Concentración bacteriana (UFC/mL) | No | Escríbelo completo: `1200000000` para 1,2 × 10⁹ |
| Observaciones | No | Notas de producción |

> La plataforma calcula sola los **días restantes** y marca cada lote como
> Vigente / Por caducar (≤ 15 días) / Caducado, y avisa en la pantalla de Biocápsulas.

### Paso 5 y 6 · Registrar el análisis de agua

*Menú: Análisis de agua → Registrar análisis*

**Es la pantalla más importante.** Tiene cuatro bloques.

**Bloque 1 — Identificación**

| Campo | Obligatorio | Nota |
|---|:---:|---|
| **Proyecto** | **Sí** | Al elegirlo se cargan sus puntos |
| Punto de muestreo | No | Se preselecciona según la etapa |
| **Etapa** | **Sí** | **Antes** (afluente) o **Después** (efluente). *De esto depende todo el cálculo* |
| Código de la muestra | No | Si lo dejas vacío: «Muestra 001», «Muestra 002»… |
| **Fecha del muestreo** | **Sí** | |
| Hora | No | Buena práctica de trazabilidad |
| Responsable | No | Se llena con tu nombre |
| Laboratorio | No | Se imprime en el informe |

**Bloque 2 — Tratamiento aplicado** *(solo tiene sentido en muestras «después»)*

| Campo | Para qué sirve |
|---|---|
| Lote de biocápsulas | Vincula el resultado con el lote: permite comparar formulaciones |
| Dosis (número de cápsulas) | Cuántas se aplicaron |
| Tiempo de retención hidráulica (h) | Cuánto estuvo el agua en contacto |

**Bloque 3 — Los 13 parámetros**

Escribe el valor que entregó el laboratorio. Solo los que tengas: los vacíos se ignoran.

| Símbolo | Parámetro | Unidad | Límite de referencia |
|---|---|---|---|
| T | Temperatura | °C | < 35 |
| pH | pH | upH | 6 – 9 |
| OD | Oxígeno Disuelto | mg/L | ≥ 5 |
| CE | Conductividad eléctrica | µS/cm | ≤ 1 500 |
| Turb | Turbidez | NTU | ≤ 20 |
| SST | Sólidos Suspendidos Totales | mg/L | ≤ 130 |
| SDT | Sólidos Disueltos Totales | mg/L | ≤ 1 600 |
| DBO₅ | Demanda Bioquímica de Oxígeno | mg/L | ≤ 100 |
| DQO | Demanda Química de Oxígeno | mg/L | ≤ 200 |
| NH₄⁺-N | Nitrógeno Amoniacal | mg/L | ≤ 30 |
| P-Total | Fósforo Total | mg/L | ≤ 10 |
| CT | Coliformes Totales | NMP/100 mL | ≤ 2 000 |
| Olor | Olor | texto | Ausencia de olor ofensivo |

*(Límites del TULSMA — Acuerdo Ministerial 097-A, Anexo 1, Tabla 9. El administrador
puede cambiarlos.)*

> **Mientras escribes**, cada campo muestra:
> - Su **semáforo** en vivo (Excelente / Aceptable / Crítico).
> - El **% de remoción** comparado con la muestra opuesta, si ya existe.
>
> Es decir: sabes si el valor cumple **antes de guardar**.

**Bloque 4 — Observaciones**

Condiciones del muestreo, aspecto de la muestra, incidencias.

Al pulsar **Guardar análisis y calcular**, la plataforma guarda y te lleva directo a
la comparativa con todo recalculado.

---

## 6. Qué representa cada gráfico del dashboard

El dashboard consolida **todos los proyectos** a los que tienes acceso. Un cliente ve
solo los suyos.

### 6.1 Las ocho tarjetas

| Tarjeta | Qué significa | De dónde sale |
|---|---|---|
| **Total clientes** | Organizaciones registradas | Conteo de la tabla de clientes |
| **Total proyectos** | Plantas o tratamientos | Conteo de proyectos |
| **Tratamientos activos** | Proyectos en operación | Proyectos con estado «Activo» |
| **Tratamientos finalizados** | Proyectos cerrados | Estado «Finalizado» |
| **Reducción promedio de contaminantes** | **Qué tan bien está funcionando el tratamiento en general** | Promedio del % de remoción de los parámetros clave, en todos los proyectos con par antes/después |
| **Cumplimiento normativo** | Qué porción del efluente está dentro de la ley | % de parámetros del efluente que cumplen su límite |
| **Calidad del agua tratada** | Nota global de 0 a 100 del efluente | Índice ICA BioCaps (ver 6.6) |
| **Análisis de agua** | Muestreos registrados | Conteo de muestreos |

> Las tres primeras miden **actividad comercial**; las tres de abajo miden **desempeño
> técnico**. Esa es la lectura ejecutiva de un vistazo.

### 6.2 «Antes vs Después del tratamiento» — barras

**Qué muestra:** la concentración media de cada contaminante antes (naranja) y después
(verde) del tratamiento, promediando todos los proyectos.

**Cómo leerlo:** barra naranja alta y barra verde baja = el tratamiento funciona.
Cuanto mayor la diferencia, mejor.

**Por qué solo aparecen algunos parámetros:** solo se grafican los que están en
**mg/L**. Mezclar mg/L con NTU o con NMP/100 mL en un mismo eje daría un gráfico sin
sentido: son magnitudes que no se pueden comparar entre sí.

Al pasar el cursor se ve el % de remoción y el límite normativo.

### 6.3 «Cumplimiento normativo» — gauge

**Qué muestra:** el porcentaje de parámetros del efluente que cumplen el límite legal.

**Cómo leerlo:** 100 % = todo el efluente es descargable. Verde ≥ 90 %, amarillo
70–90 %, rojo < 70 %.

**Ojo:** cuenta *parámetros*, no proyectos. Un 82 % significa que del total de
parámetros evaluados en todos los proyectos, el 82 % está dentro de norma.

### 6.4 «Evolución mensual del efluente» — líneas

**Qué muestra:** la concentración media mensual de NH₄⁺-N, DBO₅ y DQO **en el agua ya
tratada**.

**Cómo leerlo:** líneas que **bajan** con el tiempo = el tratamiento mejora mes a mes.
Es el gráfico que evidencia la **maduración del biofilm**: las bacterias tardan
semanas en colonizar la matriz de alginato y alcanzar su rendimiento de régimen.

Este gráfico es más convincente que cualquier medición aislada: una sola muestra buena
puede ser casualidad, una tendencia sostenida no.

### 6.5 «Comparación de parámetros» — radar

**Qué muestra:** un **sub-índice de calidad de 0 a 100 por cada parámetro**, antes
(naranja) y después (verde). 100 = calidad óptima.

**Cómo leerlo:** el polígono verde debe ser **más grande** que el naranja y acercarse
al borde. Si un vértice se hunde hacia el centro, ese parámetro es el punto débil del
tratamiento.

**Por qué un índice y no el «% del límite»:** el afluente tiene 2,4 × 10⁶ NMP/100 mL
de coliformes contra un límite de 2 000, o sea el 120 000 % del límite. Con esa escala,
ese único eje aplastaría a todos los demás. Acotando cada parámetro a 0–100, se pueden
comparar unidades distintas en el mismo eje.

### 6.6 «Tipos de clientes» y «Tipos de agua tratada» — pasteles

**Qué muestran:** la composición de la cartera. El primero, cuántos clientes hay de
cada tipo (Empresa, Municipio, Industria, Ganadería, Universidad). El segundo, qué
tipos de agua se están tratando.

**Para qué sirven:** son gráficos **de negocio**, no técnicos. Dicen en qué sector está
concentrado el emprendimiento y qué tan diversificada está la operación.

### 6.7 «Semáforo consolidado» — barra apilada

**Qué muestra:** cuántos parámetros, sumando todos los proyectos, quedaron en cada
categoría: Excelente (verde), Aceptable (amarillo), Crítico (rojo).

**Cómo leerlo:** es el **resumen de riesgo** de toda la operación. Si crece el rojo,
hay proyectos que requieren intervención inmediata.

### 6.8 «Mapa de proyectos»

**Qué muestra:** cada proyecto con coordenadas, como un marcador coloreado según la
**calidad del agua tratada** en ese proyecto.

**Cómo leerlo:** verde = efluente en buen estado; amarillo = aceptable; rojo = crítico.
Al hacer clic se ve el detalle: cliente, tipo de agua, remoción, cumplimiento.

**Si un proyecto no aparece** es porque no tiene latitud y longitud cargadas.

### 6.9 «Eficiencia por proyecto» — tabla

**Qué muestra:** los mismos datos de los gráficos, pero en números exactos y ordenados
de mejor a peor desempeño.

**Para qué sirve:** identificar de un vistazo **qué proyecto necesita atención**. Es
además la versión accesible de los gráficos: si alguien no distingue los colores, o si
hay que imprimir, la tabla contiene toda la información.

### 6.10 «Inteligencia del software — alertas activas»

**Qué muestra:** los problemas que el sistema detectó solo, en todos los proyectos.

Cada alerta dice qué pasa, en qué proyecto y **qué hacer**. Ejemplo real del sistema:

> ⚠ **Concentración elevada de nitrógeno amoniacal** · Biorremediación de lixiviados
> Se recomienda aumentar la dosis de biocápsulas y verificar la aireación del reactor
> para favorecer la nitrificación.

### 6.11 «Actividad reciente»

Las últimas operaciones: quién registró qué y cuándo. Es la trazabilidad visible; el
histórico completo está en su propia sección.

---

## 7. Después de registrar: la comparativa

*Proyecto → pestaña **Comparativa antes/después***

Es donde vive el resultado. Contiene:

1. **Selectores** de qué muestra «antes» y cuál «después» comparar.
2. **Cuatro indicadores:** remoción promedio, cumplimiento, calidad (ICA antes → después)
   y semáforo del efluente.
3. **Interpretación automática:** los hallazgos que detectó el sistema.
4. **Conclusión técnica** redactada.
5. **Tabla comparativa** de los 13 parámetros: antes, después, remoción, estado,
   límite y si cumple.
6. **Cuatro gráficos:** barras antes/después, remoción por parámetro, radar de calidad
   y evolución mensual.
7. **Ficha de cada muestra** con el lote aplicado y la fotografía del punto.
8. Botones **CSV** y **Generar reporte PDF**.

---

## 8. El reporte PDF

Se genera desde la comparativa. Incluye logo, datos del cliente y del proyecto, tabla
de las dos muestras comparadas, fotografía del punto, tabla completa de resultados con
remoción y cumplimiento, los cuatro gráficos, interpretación, conclusión, bloque de
cumplimiento normativo, firma responsable y **código QR**.

**El QR es la característica diferencial:** apunta a una página pública donde cualquiera
—sin cuenta— puede confirmar que el informe es auténtico contra la base de datos. Un
PDF se falsifica; uno verificable, no.

Cada reporte queda registrado en *Reportes PDF* y se puede volver a descargar.

---

## 9. Errores frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| «Análisis comparativo incompleto» | Falta la muestra «antes» o la «después» | Registrar la que falta en el mismo proyecto |
| El proyecto no sale en el mapa | Sin latitud/longitud | Editar el proyecto y agregarlas |
| El dashboard muestra guiones | Ningún proyecto tiene par antes/después | Completar al menos un par |
| No aparece el botón de generar reporte | Sesión con rol *cliente* | El cliente solo consulta; usar una cuenta de analista |
| La remoción sale negativa | El valor «después» es mayor que el «antes» | Verificar que la etapa de cada muestra sea la correcta |
| El informe sale con guiones | Faltan datos del cliente | Completar contacto, correo, teléfono y dirección |

---

## 10. Rutina mensual recomendada

1. Tomar las muestras en el punto de entrada y en el de salida.
2. Enviarlas al laboratorio.
3. Cuando lleguen los resultados: registrar el análisis «antes» y el «después».
4. Abrir la comparativa y revisar las alertas.
5. Generar el reporte PDF y enviarlo al cliente.
6. Si hay alertas, ajustar dosis o tiempo de retención y anotarlo en las observaciones
   del siguiente muestreo.

Con esa rutina, en seis meses se tiene la curva de evolución que demuestra el
desempeño del tratamiento — que es exactamente lo que un cliente necesita para
justificar la inversión y lo que una autoridad ambiental necesita para dar por
cumplida la normativa.
