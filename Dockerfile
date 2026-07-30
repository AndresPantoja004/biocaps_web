# ============================================================================
# BioCaps Monitor® — Imagen de producción
#
# Node 24 es requisito: la plataforma usa el módulo `node:sqlite` integrado,
# así que no hay dependencias nativas que compilar.
# ============================================================================

# ---------------------------- Etapa 1: dependencias ----------------------------
FROM node:24-alpine AS dependencias

WORKDIR /app

# Sólo los manifiestos primero, para aprovechar la caché de capas de Docker.
COPY package.json package-lock.json* ./

# El script `postinstall` copia las librerías de navegador a public/vendor,
# por eso necesita estar presente antes de instalar.
COPY scripts ./scripts

RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

# ---------------------------- Etapa 2: imagen final ----------------------------
FROM node:24-alpine AS produccion

# `tini` asegura que las señales (SIGTERM de `docker stop`) lleguen a Node
# y que no queden procesos zombis.
RUN apk add --no-cache tini wget

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    BIOCAPS_DATA_DIR=/datos \
    BIOCAPS_UPLOADS_DIR=/subidas

WORKDIR /app

COPY --from=dependencias /app/node_modules ./node_modules
COPY package.json ./
COPY index.js ./
COPY src ./src
COPY scripts ./scripts
COPY public ./public

# Vuelve a copiar las librerías de navegador por si la caché de la etapa
# anterior no las incluyó (public/vendor se genera en el postinstall).
RUN node scripts/vendor.js

# Volúmenes de datos persistentes, propiedad del usuario sin privilegios.
RUN mkdir -p /datos /subidas && chown -R node:node /datos /subidas /app

USER node

VOLUME ["/datos", "/subidas"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:3000/api/salud || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
