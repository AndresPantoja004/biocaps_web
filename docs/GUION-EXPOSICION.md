# BioCaps Monitor® — Guion técnico de exposición

Documento de apoyo para la defensa del proyecto. Contiene el argumento científico,
la explicación de cómo el software obtiene cada resultado, las cifras exactas del
caso cargado, el guion de la demostración en vivo y las respuestas a las preguntas
difíciles.

**URL de producción:** https://biocaps.davant.dev

---

## 0. Aviso de honestidad académica — léelo primero

Los datos cargados en la plataforma son **una simulación**, no resultados de
laboratorio propios. Las organizaciones son ficticias y los valores replican
rangos típicos de literatura técnica sobre aguas residuales domésticas.

Esto **no debilita** el proyecto si lo presentas bien. Lo que se defiende aquí es:

1. Un **modelo de negocio** biotecnológico.
2. Una **plataforma de software funcional** que procesa datos reales de laboratorio
   en cuanto se ingresen.
3. Un **motor de cálculo** cuya lógica es verificable y reproducible.

La frase correcta cuando muestres los números:

> «El sistema está cargado con un caso de simulación construido con valores típicos
> de literatura para una PTAR municipal, que reproduce el ejemplo del protocolo de
> desarrollo. Cuando ingresemos los resultados de nuestros ensayos de laboratorio,
> la plataforma los procesa igual: los cálculos no cambian.»

La frase que **no** debes decir: «estos son los resultados que obtuvimos». Si un
jurado pide la bitácora de laboratorio y no existe, el proyecto pierde credibilidad
entera por un detalle evitable.

---

## 1. El problema

Una parte importante de las descargas de aguas residuales en el país llega a ríos y
esteros sin tratamiento efectivo y, sobre todo, **sin monitoreo continuo ni evidencia
documentada de cumplimiento**.

Esto produce dos problemas distintos que a menudo se confunden:

| Problema | Naturaleza |
|---|---|
| El agua sale contaminada | Técnico-biológico |
| Nadie puede demostrar si sale contaminada o no | De información y trazabilidad |

**BioCaps ataca los dos:** las biocápsulas resuelven el primero; la plataforma
BioCaps Monitor® resuelve el segundo. Ese es el argumento central del emprendimiento:
vender tratamiento *con evidencia*, no tratamiento a ciegas.

---

## 2. Fundamento científico de las biocápsulas

### 2.1 Qué es una biocápsula

Una esfera de **alginato de calcio** de 3 a 4,5 mm de diámetro que contiene
inmovilizado en su interior un consorcio de bacterias seleccionadas.

**Química de la formación (gelificación iónica):**

El alginato de sodio es un polisacárido lineal formado por dos monómeros:
ácido β-D-manurónico (bloques M) y ácido α-L-gulurónico (bloques G).

Al gotear una solución de alginato de sodio (2 % p/v) sobre una solución de
cloruro de calcio (2 % p/v), los iones **Ca²⁺ desplazan al Na⁺** y forman puentes
iónicos entre los bloques G de cadenas vecinas. La estructura resultante se conoce
como modelo de **«caja de huevos» (egg-box)**: el ion calcio queda alojado entre
dos cadenas plegadas, como un huevo en su cartón.

```
Alginato-Na  +  CaCl₂   →   Alginato-Ca (gel)  +  2 NaCl
```

La gelificación es **instantánea, a temperatura ambiente y sin solventes orgánicos**:
por eso las bacterias sobreviven al proceso. Ésa es la ventaja frente a otras matrices
de inmovilización que requieren calor o polimerización química.

### 2.2 Por qué inmovilizar en vez de usar bacterias libres

Éste es el corazón del argumento científico. Hay cuatro razones, y la primera es
la más fuerte:

**a) Desacopla el tiempo de retención celular del hidráulico.**

En un reactor de biomasa suspendida, las bacterias se lavan con el efluente. Para
que una población se mantenga, el tiempo de retención celular debe superar su tiempo
de duplicación. Las bacterias nitrificantes son **de crecimiento muy lento**
(µmáx del orden de 0,3–0,8 d⁻¹ a 20 °C, frente a 3–6 d⁻¹ de las heterótrofas):
en un sistema convencional, si el caudal sube o baja la temperatura, se produce
**lavado (washout)** y la nitrificación se cae primero.

Al estar inmovilizadas, las bacterias **no se van con el agua**. Se puede operar con
tiempos de retención hidráulica cortos manteniendo poblaciones de crecimiento lento.
*Esta es la razón principal por la que la inmovilización tiene sentido para remover
nitrógeno amoniacal.*

**b) Alta densidad celular por unidad de volumen** — se concentra más biomasa activa
en el mismo reactor (los lotes trabajan en el orden de 10⁹ UFC/mL).

**c) Protección frente a cargas de choque y tóxicos.** El gradiente de difusión hacia
el interior de la esfera amortigua los picos de concentración: las células del núcleo
ven una concentración menor y más estable que las del medio.

**d) Recuperación y reutilización.** Las esferas se retiran con una malla, se lavan y
se reemplazan por lote. Operativamente esto es enorme: convierte el tratamiento
biológico en un **consumible con fecha de caducidad**, que es exactamente el modelo
de negocio (venta recurrente de lotes + monitoreo).

### 2.3 Los consorcios y qué reacción realiza cada uno

| Consorcio | Especies | Función bioquímica |
|---|---|---|
| **BC-N1 · Nitrificante** | *Nitrosomonas europaea*, *Nitrobacter winogradskyi*, *Nitrospira* sp. | Oxidación del nitrógeno amoniacal |
| **BC-O2 · Degradador** | *Bacillus subtilis*, *Pseudomonas putida*, *Rhodococcus erythropolis* | Oxidación de materia orgánica, hidrólisis de grasas |
| **BC-P3 · Acumulador de P** | *Acinetobacter johnsonii*, *Bacillus licheniformis* | Acumulación intracelular de fosfatos |
| **BC-M4 · Mixto lixiviados** | *Pseudomonas aeruginosa*, *Bacillus cereus*, *Enterobacter cloacae*, *Aspergillus niger* | Compuestos recalcitrantes, ácidos húmicos |

**Nitrificación — las dos etapas (esto te lo pueden preguntar):**

```
Etapa 1 (bacterias oxidantes de amonio, Nitrosomonas):
    NH₄⁺ + 1,5 O₂  →  NO₂⁻ + H₂O + 2 H⁺

Etapa 2 (bacterias oxidantes de nitrito, Nitrobacter / Nitrospira):
    NO₂⁻ + 0,5 O₂  →  NO₃⁻

Global:
    NH₄⁺ + 2 O₂  →  NO₃⁻ + 2 H⁺ + H₂O
```

Tres consecuencias que debes saber explicar:

1. **Demanda de oxígeno:** 4,57 g de O₂ por cada gramo de N-amoniacal oxidado. Por eso
   el oxígeno disuelto es un parámetro crítico y no un adorno: sin OD no hay nitrificación.
2. **Consumo de alcalinidad:** se liberan 2 H⁺ por cada NH₄⁺, lo que consume unos
   7,14 g de CaCO₃ por gramo de N. En aguas de baja alcalinidad el pH cae y la
   nitrificación se autoinhibe. Por eso el pH se monitorea.
3. **Se transforma, no se destruye.** La nitrificación convierte NH₄⁺ (tóxico para
   peces, demandante de oxígeno) en NO₃⁻ (mucho menos tóxico, pero sigue siendo
   nutriente). Para eliminar el nitrógeno del sistema haría falta una etapa
   **anóxica de desnitrificación** (NO₃⁻ → N₂ gas). **Esta es una limitación real
   del alcance actual y conviene que la digas tú antes de que te la señalen.**

---

## 3. Por qué esos 13 parámetros y no otros

No son una lista arbitraria: cada uno responde una pregunta distinta.

| Grupo | Parámetros | Qué informan |
|---|---|---|
| **Condiciones del proceso** | Temperatura, pH, Oxígeno Disuelto | Si las bacterias *pueden* trabajar. Fuera de rango, el tratamiento no falla por dosis sino por ambiente. |
| **Carga orgánica** | DBO₅, DQO | Cuánta materia oxidable hay. Su **relación** dice si el agua es tratable biológicamente. |
| **Sólidos** | SST, SDT, Turbidez | Eficacia de la separación física y claridad del efluente. |
| **Nutrientes** | NH₄⁺-N, Fósforo Total | Potencial de eutrofización y toxicidad del cuerpo receptor. |
| **Sanitario** | Coliformes Totales | Riesgo para la salud pública. |
| **Salinidad** | Conductividad | Carga iónica; puede inhibir la actividad microbiana. |
| **Organoléptico** | Olor | Indicador de campo de condiciones sépticas. |

**El dato que impresiona en una defensa — la relación DBO₅/DQO:**

En el caso cargado, el afluente tiene **DBO₅/DQO = 285/610 = 0,47**.

- Relación **> 0,4** → el agua es **biodegradable**: el tratamiento biológico es la
  tecnología apropiada.
- Relación **< 0,3** → predominan compuestos recalcitrantes: harían falta procesos
  fisicoquímicos u oxidación avanzada, y las biocápsulas rendirían poco.

Es decir: **el propio análisis justifica la elección de la tecnología**. Ése es un
argumento de ingeniería, no de marketing.

---

## 4. Cómo el software obtiene los resultados

Toda la lógica está en un solo archivo auditable: [`src/lib/analisis.js`](../src/lib/analisis.js).

### 4.1 Reducción porcentual (Módulo 11)

$$\% \text{ de remoción} = \frac{\text{Inicial} - \text{Final}}{\text{Inicial}} \times 100$$

Se aplica automáticamente a los nueve parámetros reducibles. Verificación con el
ejemplo del protocolo:

$$\frac{120 - 18}{120} \times 100 = 85{,}0\ \%$$

No se aplica a pH ni temperatura (son rangos, no «cuanto menos mejor») ni al oxígeno
disuelto (ahí el objetivo es **aumentar**, y el software lo evalúa en sentido inverso).

### 4.2 Semáforo (Módulo 12)

Cada parámetro se clasifica contra umbrales **configurables desde la interfaz**. Los
valores por defecto provienen del **TULSMA — Acuerdo Ministerial 097-A, Anexo 1,
Tabla 9** (límites de descarga a un cuerpo de agua dulce, Ecuador).

| Criterio | Excelente | Aceptable | Crítico |
|---|---|---|---|
| **Reducir** (DBO₅, DQO, NH₄⁺-N…) | ≤ umbral excelente | ≤ límite permisible | > límite |
| **Aumentar** (OD) | ≥ umbral excelente | ≥ límite | < límite |
| **Rango** (pH, T) | dentro del rango ideal | dentro del permisible | fuera |

Que los límites sean editables no es un adorno: si mañana cambia la normativa, o si el
cliente descarga a alcantarillado en vez de a un río (límites distintos), se ajusta
sin tocar código y **todo el histórico se recalcula solo**.

### 4.3 Índice de Calidad de Agua BioCaps

**Sé honesto en esto:** es un índice **propio y documentado**, no un estándar
internacional como el NSF-WQI. Su construcción:

1. Cada parámetro aporta un **sub-índice acotado de 0 a 100** mediante una función
   lineal por tramos según su distancia al límite.
2. El ICA es el **promedio** de los sub-índices disponibles.
3. Clasificación: ≥85 Excelente · 70–85 Buena · 55–70 Aceptable · 35–55 Deficiente · <35 Crítica.

**Por qué un sub-índice acotado y no el simple «% del límite»:** el afluente tiene
2,4 × 10⁶ NMP/100 mL de coliformes contra un límite de 2 000, o sea **120 000 % del
límite**. En un gráfico comparativo ese valor aplastaría todos los demás ejes y el
gráfico sería ilegible. Acotando cada parámetro a 0–100 todos los parámetros quedan
comparables en un mismo eje aunque tengan unidades distintas.

*(Éste es un buen detalle para mencionar: muestra que hubo criterio de diseño, no
sólo programación.)*

### 4.4 Motor de reglas — la «inteligencia» del software

No es un modelo de aprendizaje automático, y **no debes llamarlo IA**. Es un **sistema
experto basado en reglas**: condiciones sobre los resultados que disparan una
interpretación y una recomendación operativa.

| Condición | Salida |
|---|---|
| NH₄⁺-N sobre el límite | ⚠ «Concentración elevada de nitrógeno amoniacal. Se recomienda aumentar la dosis de biocápsulas y verificar la aireación para favorecer la nitrificación.» |
| DBO₅ disminuye ≥ 50 % | ✓ «Tratamiento eficiente.» |
| DQO disminuye ≥ 50 % | ✓ «Alta degradación de materia orgánica.» |
| DBO₅ **no** disminuye | ⚠ Revisar tiempo de retención, viabilidad del lote y cargas de choque |
| pH fuera de 6–9 | ⚠ Inhibición de la actividad bacteriana |
| OD < 2 mg/L | ⚠ Condiciones cercanas a anoxia: limita la oxidación aerobia |
| Coliformes sobre límite | ⚠ Requiere desinfección final |

Si te preguntan «¿es inteligencia artificial?», la respuesta correcta y sólida es:

> «Es un sistema experto de reglas, no aprendizaje automático. Codifica el criterio
> de un especialista en tratamiento de aguas para que la interpretación sea inmediata
> y reproducible. Para usar aprendizaje automático necesitaríamos un histórico de
> cientos de campañas, que es justamente lo que esta plataforma empezará a acumular.»

Esa respuesta convierte una limitación en la hoja de ruta del producto.

---

## 5. Resultados del caso cargado

**PTAR Municipal Santo Domingo — campaña de julio 2026** (Muestra 011 → Muestra 012)

| Parámetro | Antes | Después | Remoción | Límite TULSMA | Estado |
|---|---:|---:|---:|---:|---|
| Temperatura (°C) | 25,2 | 24,4 | — | < 35 | Excelente |
| pH | 7,2 | 7,4 | — | 6 – 9 | Excelente |
| Oxígeno Disuelto (mg/L) | 1,0 | 5,6 | ↑ | ≥ 5 | Excelente |
| Conductividad (µS/cm) | 1 180 | 640 | 45,8 % | ≤ 1 500 | Excelente |
| Turbidez (NTU) | 165 | 8,5 | **94,8 %** | ≤ 20 | Excelente |
| SST (mg/L) | 320 | 42 | 86,9 % | ≤ 130 | Excelente |
| SDT (mg/L) | 890 | 520 | 41,6 % | ≤ 1 600 | Excelente |
| **DBO₅ (mg/L)** | 285 | 38 | **86,7 %** | ≤ 100 | Excelente |
| **DQO (mg/L)** | 610 | 92 | **84,9 %** | ≤ 200 | Excelente |
| **NH₄⁺-N (mg/L)** | **120** | **18** | **85,0 %** | ≤ 30 | Aceptable |
| Fósforo Total (mg/L) | 12,5 | 3,9 | 68,8 % | ≤ 10 | Excelente |
| Coliformes (NMP/100 mL) | 2,4 × 10⁶ | 780 | 99,97 % | ≤ 2 000 | Excelente |

**Indicadores globales**

- Remoción promedio de parámetros clave: **86,7 %**
- Cumplimiento normativo: **100 %** (12 de 12 parámetros evaluados)
- ICA BioCaps: **36 → 89** (Deficiente → Excelente)
- Semáforo del efluente: 11 excelente · 1 aceptable · 0 crítico

### 5.1 El argumento más fuerte: la curva de maduración

No presentes solo la última campaña. **La progresión mes a mes es la evidencia real**,
porque una sola medición podría ser casualidad y una tendencia sostenida no:

| Campaña | NH₄⁺-N después | Remoción NH₄ | DBO₅ después | OD después | Remoción promedio |
|---|---:|---:|---:|---:|---:|
| Feb 2026 | 53,5 | 57,5 % | 113 | 1,9 | 62,4 % |
| Mar 2026 | 39,0 | 66,5 % | 82,3 | 2,6 | 70,4 % |
| Abr 2026 | 32,4 | 75,9 % | 68,5 | 3,4 | 78,6 % |
| May 2026 | 24,5 | 80,0 % | 51,8 | 4,3 | 82,3 % |
| Jun 2026 | 19,6 | 82,7 % | 41,3 | 5,1 | 84,7 % |
| **Jul 2026** | **18,0** | **85,0 %** | **38,0** | **5,6** | **86,7 %** |

**Cómo explicarlo (esto demuestra que entiendes el proceso, no solo el software):**

> «La eficiencia no arranca al máximo: sube de 62 % a 87 % en cinco meses. Eso es
> coherente con la **maduración del biofilm** dentro de la matriz de alginato: las
> poblaciones nitrificantes, que son de crecimiento lento, necesitan semanas para
> colonizar la esfera y alcanzar su densidad de régimen. Se ve en el oxígeno disuelto
> del efluente, que sube de 1,9 a 5,6 mg/L: el sistema pasa de casi anóxico a
> plenamente aerobio. Un resultado que apareciera perfecto desde el primer día sería
> sospechoso.»

---

## 6. Qué hace la plataforma (parte de ingeniería)

### 6.1 Flujo

```
Login → Dashboard → Cliente → Proyecto → Punto de muestreo → Resultados
      → Análisis automático → Gráficos → Reporte PDF → Histórico
```

### 6.2 Arquitectura

| Capa | Tecnología | Por qué |
|---|---|---|
| Backend | Node.js + Express | Un solo lenguaje en todo el proyecto |
| Base de datos | SQLite (`node:sqlite`, integrado en Node 24) | Sin dependencias nativas ni servidor de base de datos aparte; toda la información en un archivo respaldable |
| Frontend | JavaScript estándar, sin framework | Sin compilación: lo que se lee es lo que se ejecuta |
| Gráficos | Chart.js · Mapas: Leaflet · PDF: jsPDF | Servidos localmente: funciona sin internet salvo el mapa |
| Despliegue | Docker + NGINX + Let's Encrypt | Reproducible en cualquier servidor |

**14 tablas:** usuarios, clientes, proyectos, puntos de muestreo, muestreos,
parámetros, consorcios bacterianos, biocápsulas, resultados, reportes, archivos,
fotografías, historial y noticias.

### 6.3 Seguridad — puntos que suman en la defensa

- Contraseñas con **scrypt** y sal única por usuario (nunca se guardan en claro).
- Sesión con token firmado por **HMAC-SHA256**, caducidad de 12 horas.
- **Tres roles** con permisos verificados **en el servidor**, no solo ocultando botones:
  el rol *cliente* solo alcanza los datos de su propia organización.
- Limitación de intentos de acceso contra fuerza bruta.
- Todas las operaciones quedan en un **histórico** con usuario, fecha y detalle.
- HTTPS con certificado de Let's Encrypt y renovación automática.

### 6.4 Reporte PDF con verificación por QR

Cada informe incluye logo, datos del cliente, fotografía del punto de muestreo, tabla
completa de resultados, gráficos, interpretación, conclusión, cumplimiento normativo,
firma responsable y un **código QR**.

El QR apunta a una página pública que consulta la base de datos y confirma si el
informe es auténtico. **Esto es lo que diferencia el producto:** cualquiera —una
auditoría ambiental, un municipio, un ciudadano— puede verificar un informe sin tener
cuenta en el sistema. Convierte un PDF, que es falsificable, en un documento
comprobable.

*Demuéstralo en vivo: escanea el QR con el celular delante del jurado.*

---

## 7. Guion de la demostración en vivo (8 minutos)

| Tiempo | Qué haces | Qué dices |
|---|---|---|
| 0:00 | Abrir `biocaps.davant.dev` | El problema y la propuesta. Señalar la sección de ODS. |
| 1:00 | Entrar como **administrador** | Los tres roles y por qué existen |
| 1:30 | **Dashboard** | «Ocho indicadores consolidados. 86,7 % de remoción promedio, 82 % de cumplimiento.» Señalar el mapa. |
| 2:30 | Alertas de inteligencia | Mostrar la alerta de NH₄⁺-N del proyecto de lixiviados: el sistema detectó solo el problema |
| 3:00 | Proyectos → **PTAR Santo Domingo** → Comparativa | **El momento central.** La tabla de 13 parámetros, señalar NH₄⁺-N 120 → 18 = 85 % |
| 4:30 | Gráfico de evolución mensual | La curva de maduración del biofilm (sección 5.1) |
| 5:00 | **Generar reporte PDF** | Abrirlo delante del jurado |
| 6:00 | **Escanear el QR con el celular** | La verificación pública. Éste es el golpe de efecto. |
| 7:00 | Registrar un análisis nuevo | Escribir NH₄⁺-N = 150 y mostrar cómo el semáforo se pone **rojo mientras escribes** |
| 7:30 | Salir y entrar como **cliente** | Mostrar que solo ve sus propios proyectos: la seguridad es real |

**Antes de exponer, verifica:**

- [ ] `https://biocaps.davant.dev` carga y el candado del navegador está cerrado
- [ ] Iniciaste sesión una vez ese mismo día (la sesión caduca a las 12 h)
- [ ] El celular con el que escanearás el QR tiene datos o wifi
- [ ] Cambiaste las contraseñas de demostración (el sitio es público)
- [ ] Tienes una captura del dashboard **por si falla el internet de la sala**

---

## 8. Preguntas difíciles y cómo responderlas

**«¿Estos datos son de ustedes?»**
> No. Es un caso de simulación con valores típicos de literatura para una PTAR
> municipal, que reproduce el ejemplo del protocolo de desarrollo. La plataforma está
> lista para procesar nuestros ensayos en cuanto los tengamos; el cálculo es el mismo.

**«¿A dónde va el nitrógeno? ¿Lo eliminan?»**
> No lo eliminamos, lo **transformamos**: la nitrificación convierte amonio en nitrato,
> que es mucho menos tóxico y no consume oxígeno del cuerpo receptor. Para retirar el
> nitrógeno del sistema haría falta una etapa anóxica de desnitrificación que lo
> convierta en N₂ gaseoso. Está en nuestra hoja de ruta.

**«El alginato de calcio se degrada con fosfatos. Su afluente tiene 12,5 mg/L de fósforo.»**
> *(Pregunta de examinador exigente. Que la sepas responder vale mucho.)*
> Correcto, y es la principal limitación de la matriz: el fosfato, el citrato y el EDTA
> **secuestran el Ca²⁺** y desestabilizan el gel. Por eso los lotes tienen vida útil
> definida —90 días— y la plataforma alerta cuando un lote está por caducar. Las líneas
> de mejora son aumentar la reticulación con más CaCl₂, usar Ba²⁺ en lugar de Ca²⁺, o
> recubrir con quitosano.

**«¿Por qué inmovilizar? ¿No es más barato echar las bacterias sueltas?»**
> Porque las nitrificantes son de crecimiento muy lento y en biomasa suspendida se
> lavan con el efluente. La inmovilización desacopla el tiempo de retención celular
> del hidráulico: podemos operar con 24 horas de retención sin perder las poblaciones.
> Además permite recuperar y reponer por lote, que es la base del modelo de negocio.

**«¿Cómo sabemos que la mejora es por las biocápsulas y no por otra cosa?»**
> Con este diseño no lo sabemos con certeza: falta un **control sin biocápsulas** en
> paralelo. Es una limitación del diseño experimental, no del software. La plataforma
> registra la dosis y el lote aplicados en cada muestreo, así que soporta la
> comparación en cuanto tengamos el control.

**«¿Es inteligencia artificial?»**
> No. Es un sistema experto de reglas que codifica criterio técnico. Aprendizaje
> automático requeriría un histórico de cientos de campañas — que es justamente lo
> que la plataforma empezará a acumular.

**«¿Por qué SQLite y no PostgreSQL?»**
> Por el tamaño del problema: un laboratorio genera decenas de análisis al mes, no
> millones. SQLite elimina un servicio que administrar y respaldar, y toda la
> información cabe en un archivo que se copia. Si el volumen creciera, la capa de
> datos está aislada y migrar es acotado.

**«¿Cómo evitan que alguien falsifique un informe?»**
> Cada informe lleva un código único y un QR que apunta a una página pública de
> verificación contra la base de datos. Se lo puedo demostrar ahora mismo. *(Escanéalo.)*

**«¿Qué pasa si el cliente entra y ve datos de otro cliente?»**
> No puede. La restricción se aplica en el servidor, en cada consulta, no ocultando
> botones en la interfaz. Se lo muestro entrando con la cuenta de cliente.

---

## 9. Limitaciones — dilas tú primero

Un proyecto que reconoce sus límites se defiende mejor que uno que finge no tenerlos.

1. **Los datos cargados son simulados**, no ensayos propios.
2. **No hay grupo control** sin biocápsulas, así que la causalidad no está demostrada.
3. **No se elimina nitrógeno**, se transforma a nitrato: falta la etapa de desnitrificación.
4. **El alginato es sensible a fosfatos y quelantes**, lo que limita la vida útil.
5. **El ICA es un índice propio**, no un estándar internacional validado.
6. **La transferencia de masa** hacia el interior de la esfera no está caracterizada:
   no medimos el factor de efectividad ni el perfil de difusión.
7. **La plataforma no valida** que el dato ingresado sea correcto: si el laboratorio se
   equivoca, el sistema calcula sobre un dato equivocado. Es una herramienta de
   gestión y trazabilidad, no de control de calidad analítica.

---

## 10. El cierre

> «BioCaps no vende un producto biológico: vende **tratamiento con evidencia**. La
> biocápsula hace el trabajo en el reactor y la plataforma lo demuestra con un
> informe que cualquiera puede verificar escaneando un código. Hoy está en producción,
> en `biocaps.davant.dev`, y procesa datos reales desde el momento en que se ingresan.»
