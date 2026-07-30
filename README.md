# 🧬 BioCaps Monitor®

Plataforma inteligente de monitoreo del tratamiento de aguas residuales con biocápsulas
de alginato de sodio y consorcios bacterianos.

Implementa el *Protocolo de Desarrollo del Software · Plataforma BioCaps Monitor®*:
registra clientes, proyectos, puntos de muestreo y análisis fisicoquímicos; analiza
automáticamente la eficiencia del tratamiento; compara resultados antes y después;
genera gráficos, indicadores ambientales y reportes técnicos en PDF; y muestra
dashboards ejecutivos.

---

## Puesta en marcha

```bash
npm install     # instala dependencias y copia las librerías de navegador
npm run seed    # carga el proyecto de demostración (PTAR de Santo Domingo)
npm start       # arranca en http://localhost:3000
```

| Dirección | Contenido |
|---|---|
| `http://localhost:3000/` | Sitio público: emprendimiento, ODS, servicios, noticias |
| `http://localhost:3000/app` | Plataforma (requiere iniciar sesión) |
| `http://localhost:3000/verificar/<token>` | Verificación pública de un reporte por código QR |

### Cuentas de demostración

| Rol | Correo | Contraseña | Alcance |
|---|---|---|---|
| Administrador | `admin@biocaps.ec` | `biocaps2026` | Todo, incluidos límites del semáforo y usuarios |
| Analista | `analista@biocaps.ec` | `biocaps2026` | Registra clientes, proyectos, muestreos y emite reportes |
| Cliente | `cliente@emapasd.gob.ec` | `biocaps2026` | Consulta únicamente los proyectos de su organización |

Otros comandos:

```bash
npm run reset   # borra los datos y vuelve a cargar la demostración
npm run vendor  # recopia las librerías de navegador a public/vendor
```

### Crear una cuenta

La pantalla de acceso tiene dos pestañas: **Iniciar sesión** y **Crear cuenta**. El
registro da de alta la organización y una cuenta con rol **cliente**, que sólo consulta
los datos de su propia organización. Los perfiles de analista y administrador los crea
un administrador desde *Configuración › Usuarios*.

Con `BIOCAPS_REGISTRO_APROBACION=true` las cuentas nuevas quedan inactivas hasta que un
administrador pulsa **Aprobar** en esa misma pantalla. Con `BIOCAPS_REGISTRO_PUBLICO=false`
la pestaña desaparece y sólo el administrador puede crear usuarios.

---

## Despliegue en producción

### Con Docker Compose (recomendado)

```bash
cp .env.example .env
# Genere el secreto de sesiones y péguelo en BIOCAPS_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Ajuste BIOCAPS_URL con su dominio real (se incrusta en los códigos QR).

docker compose up -d --build
docker compose exec biocaps npm run seed     # opcional: datos de demostración
docker compose logs -f biocaps
```

La aplicación queda en `http://localhost:8080` (cambie `BIOCAPS_PUERTO`). Los datos
viven en dos volúmenes con nombre —`biocaps_datos` y `biocaps_subidas`—, de modo que
reconstruir la imagen no borra la información:

```bash
docker compose down                       # detiene, conserva los datos
docker compose down -v                    # ATENCIÓN: borra también los volúmenes
docker compose exec biocaps npm run reset # recarga la demostración
```

Copia de seguridad:

```bash
docker run --rm -v biocaps_datos:/d -v "$PWD":/respaldo alpine \
  tar czf /respaldo/biocaps-datos-$(date +%F).tar.gz -C /d .
```

### Variables de entorno

Todas se documentan en [.env.example](.env.example). Las que importan al salir a producción:

| Variable | Para qué sirve |
|---|---|
| `BIOCAPS_SECRET` | **Obligatoria.** Firma los tokens de sesión. Si cambia, se cierran todas las sesiones. |
| `BIOCAPS_URL` | Dominio público. Se incrusta en los QR de los reportes: sin ella, los QR apuntan al host de la petición. |
| `BIOCAPS_COOKIE_SEGURA` | Cookie sólo por HTTPS. Actívela **después** de tener certificado; si no, nadie podrá iniciar sesión. |
| `BIOCAPS_TRAS_PROXY` | Actívela si hay Nginx/Traefik delante, para que la IP real llegue al limitador de intentos. |
| `BIOCAPS_REGISTRO_PUBLICO` | Habilita la pestaña «Crear cuenta». |
| `BIOCAPS_REGISTRO_APROBACION` | Las cuentas nuevas nacen inactivas hasta que un administrador las aprueba. |
| `BIOCAPS_PASSWORD_MIN` | Longitud mínima de contraseña (8 por defecto en producción). |

### Detrás de un proxy inverso

Ejemplo con Nginx y HTTPS:

```nginx
server {
    listen 443 ssl http2;
    server_name monitor.biocaps.ec;

    ssl_certificate     /etc/letsencrypt/live/monitor.biocaps.ec/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.biocaps.ec/privkey.pem;

    client_max_body_size 10M;   # subida de fotografías

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Con HTTPS activo ponga `BIOCAPS_COOKIE_SEGURA=true` y `BIOCAPS_TRAS_PROXY=true`.

### Lista de verificación antes de publicar

- [ ] `BIOCAPS_SECRET` propio, de al menos 64 caracteres, fuera del control de versiones.
- [ ] `BIOCAPS_URL` con el dominio real y HTTPS.
- [ ] Contraseñas de las cuentas de demostración cambiadas, o base cargada sin `npm run seed`.
- [ ] `BIOCAPS_COOKIE_SEGURA=true` una vez que el certificado funcione.
- [ ] Copia de seguridad periódica del volumen `biocaps_datos`.
- [ ] Decidido si el registro público queda abierto o requiere aprobación.

### Sin Docker

```bash
NODE_ENV=production BIOCAPS_SECRET=… BIOCAPS_URL=https://… node index.js
```

Node 24 o superior. Conviene un supervisor (systemd, pm2) para reinicios automáticos.

---

## Flujo del software

```
Login → Dashboard → Cliente → Proyecto → Punto de muestreo → Resultados
      → Análisis automático → Gráficos → Reporte PDF → Histórico
```

## Módulos implementados

| # | Módulo | Dónde |
|---|---|---|
| 1 | Inicio: logo, botón Ingresar, acerca del emprendimiento, ODS, servicios, noticias | `public/index.html` |
| 2 | Login con tres roles | `src/routes/auth.js`, `public/js/app.js` |
| 3 | Dashboard con tarjetas dinámicas | `src/routes/dashboard.js`, `public/js/vista-dashboard.js` |
| 4 | Clientes (empresa, municipio, industria, ganadería, universidad) | `src/routes/clientes.js`, `public/js/vista-clientes.js` |
| 5 | Proyectos (tipo de agua, fechas, estado, ubicación) | `src/routes/proyectos.js`, `public/js/vista-proyectos.js` |
| 6 | Puntos de muestreo (código, coordenadas, descripción, fotografía) | `src/routes/proyectos.js`, `src/routes/archivos.js` |
| 7 | Registro de análisis de agua (una muestra por muestreo) | `src/routes/muestreos.js`, `public/js/vista-analisis.js` |
| 8 | Los 13 parámetros fisicoquímicos y biológicos | `src/db.js` (catálogo `parametros`) |
| 9 | Consorcios bacterianos (especies, UFC/mL) | `src/routes/biocapsulas.js` |
| 10 | Biocápsulas (alginato/CaCl₂, diámetro, número, peso, concentración, vida útil) | `src/routes/biocapsulas.js` |
| 11 | Algoritmos automáticos de reducción porcentual | `src/lib/analisis.js` |
| 12 | Indicadores tipo semáforo con límites configurables | `src/lib/analisis.js`, `public/js/vista-biocapsulas.js` |
| 13 | Gráficos: barras, líneas, gauge, pastel, mapa y radar | `public/js/graficos.js` |
| 14 | Reportes PDF con logo, datos, fotografía, resultados, gráficos, conclusión, firma y QR | `public/js/pdf.js`, `src/routes/reportes.js` |

---

## Cómo calcula el software

### Reducción porcentual (Módulo 11)

$$\\% = \\frac{\\text{Inicial} - \\text{Final}}{\\text{Inicial}} \\times 100$$

Ejemplo del protocolo, reproducido por la semilla de demostración:
**NH₄⁺-N 120 → 18 mg/L = 85 % de remoción.**

Se calcula automáticamente para todos los parámetros reducibles: NH₄⁺-N, DBO₅, DQO,
SST, SDT, turbidez, conductividad, fósforo total y coliformes totales.

### Semáforo (Módulo 12)

Cada parámetro se clasifica según umbrales **configurables por el administrador**
(*Configuración › Límites y parámetros*):

| Criterio | 🟢 Excelente | 🟡 Aceptable | 🔴 Crítico |
|---|---|---|---|
| **Reducir** (DBO₅, DQO, NH₄⁺-N…) | valor ≤ umbral excelente | valor ≤ límite permisible | valor > límite |
| **Aumentar** (oxígeno disuelto) | valor ≥ umbral excelente | valor ≥ límite | valor < límite |
| **Rango** (pH, temperatura) | dentro del rango ideal | dentro del permisible | fuera |

Los valores por defecto provienen del **TULSMA — Acuerdo Ministerial 097-A, Anexo 1,
Tabla 9** (descarga a un cuerpo de agua dulce, Ecuador).

### Índice de Calidad de Agua BioCaps (ICA)

Cada parámetro aporta un sub-índice acotado de 0 a 100 en función de su distancia al
límite; el ICA es su promedio. Se usa en la tarjeta «Calidad del agua» y en el radar,
porque a diferencia del «% del límite» permite comparar en un mismo eje parámetros con
unidades muy distintas (unos coliformes de 2,4 × 10⁶ NMP/100 mL equivalen al 120 000 %
de su límite y aplastarían cualquier otro eje).

### Inteligencia del software

Reglas que interpretan los resultados y recomiendan acciones, por ejemplo:

- ⚠ **NH₄⁺-N sobre el límite** → «Concentración elevada de nitrógeno amoniacal.
  Se recomienda aumentar la dosis de biocápsulas…»
- ✓ **DBO₅ disminuye** → «Tratamiento eficiente.»
- ✓ **DQO disminuye** → «Alta degradación de materia orgánica.»
- ⚠ pH fuera de rango, oxígeno disuelto insuficiente, coliformes elevados,
  fósforo sobre el límite, turbidez alta, desempeño global bajo…

Las reglas están en `src/lib/analisis.js` (constante `REGLAS`) y se amplían añadiendo
entradas a esa lista.

---

## Arquitectura

```
biocaps_web/
├── index.js                  Servidor Express
├── src/
│   ├── db.js                 Esquema SQLite y catálogo de parámetros
│   ├── seed.js               Proyecto de demostración
│   ├── lib/
│   │   ├── analisis.js       Motor de cálculo, semáforo e inteligencia
│   │   └── auth.js           Contraseñas (scrypt) y sesiones (HMAC)
│   └── routes/               API REST por módulo
├── public/
│   ├── index.html            Módulo 1 · sitio público
│   ├── app.html              Plataforma (SPA)
│   ├── verificar.html        Verificación pública por QR
│   ├── css/ js/ assets/
│   └── vendor/               Chart.js, Leaflet, jsPDF (servidos localmente)
├── data/biocaps.db           Base de datos SQLite
└── uploads/                  Fotografías y adjuntos
```

**Sin framework de compilación.** El backend usa Express y el módulo `node:sqlite`
integrado en Node 24 (sin dependencias nativas que compilar); el frontend es
JavaScript estándar. Las librerías de navegador se sirven desde `public/vendor`, así
que la plataforma funciona **sin conexión a internet** salvo por los mosaicos del mapa.

### Base de datos

Tablas: `usuarios`, `clientes`, `proyectos`, `puntos_muestreo`, `muestreos`,
`parametros`, `consorcios_bacterianos`, `biocapsulas`, `resultados`, `reportes`,
`archivos`, `fotografias`, `historial` y `noticias`.

### Seguridad

- Contraseñas con **scrypt** y sal por usuario.
- Sesión mediante token firmado con **HMAC-SHA256** (12 h); el secreto se genera en el
  primer arranque en `data/.session-secret`.
- Autorización por rol en cada ruta; el rol *cliente* sólo alcanza los datos de su
  propia organización, comprobado en el servidor y no sólo en la interfaz.
- Validación de todos los valores antes de escribir, dentro de una transacción.

---

## Datos de demostración

Simula la planta de tratamiento de aguas residuales de **Santo Domingo de los
Tsáchilas** con seis campañas mensuales (febrero–julio 2026) antes y después del
tratamiento, más cinco proyectos adicionales de agua industrial, agrícola y lixiviados.

| | |
|---|---|
| Clientes | 5 |
| Proyectos | 6 |
| Puntos de muestreo | 12 |
| Análisis de agua | 24 |
| Resultados | 312 |
| Lotes de biocápsulas | 6 |

La última campaña de la PTAR reproduce el ejemplo del protocolo:
**NH₄⁺-N 120 → 18 mg/L (85 %)**, DBO₅ 285 → 38 mg/L (86,7 %), DQO 610 → 92 mg/L (84,9 %),
con 100 % de cumplimiento normativo.

> Los datos son de **demostración académica**: las organizaciones son ficticias y los
> valores replican rangos típicos de literatura técnica.

---

## Accesibilidad de las visualizaciones

- Paleta categórica verificada para deficiencias de visión del color sobre la
  superficie oscura de la aplicación (separación CVD ΔE ≥ 8 entre series contiguas).
- El semáforo nunca comunica el estado sólo con color: siempre lleva emoji y etiqueta.
- Cada gráfico va acompañado de su tabla de datos, y toda vista permite exportar a CSV.
- Un solo eje por gráfico; nunca dos escalas verticales.
- El color identifica al parámetro y se mantiene en todas las pantallas y en el PDF.

## Notas técnicas

- El PDF usa las fuentes estándar (WinAnsi), que no incluyen subíndices ni los símbolos
  `≤ ≥ → ×`; `public/js/pdf.js` convierte el texto antes de escribirlo (`DBO₅` → `DBO5`,
  `≤ 100` → `<= 100`) para evitar caracteres corruptos.
- El mapa usa mosaicos de OpenStreetMap y necesita conexión; el resto de la plataforma
  funciona sin ella.
- Puerto configurable con `PORT`; ruta de la base con `BIOCAPS_DB`; URL pública para los
  códigos QR con `BIOCAPS_URL`.
