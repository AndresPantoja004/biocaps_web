#!/usr/bin/env bash
# ============================================================================
# BioCaps Monitor® — Emisión del certificado TLS (sólo la primera vez)
#
# Resuelve el bloqueo mutuo del arranque inicial: NGINX no levanta sin
# certificado, y Certbot necesita que NGINX responda para validar el dominio.
# La solución es instalar un certificado autofirmado temporal, levantar NGINX,
# pedir el certificado real y recargar.
#
#   chmod +x deploy/emitir-certificado.sh
#   ./deploy/emitir-certificado.sh
#
# Requisitos previos:
#   · El DNS de DOMINIO debe apuntar ya a este servidor.
#   · Los puertos 80 y 443 deben estar abiertos desde internet.
# ============================================================================
set -euo pipefail

DOMINIO="${BIOCAPS_DOMINIO:-biocaps.davant.dev}"
CORREO="${BIOCAPS_CORREO_TLS:-contacto@biocaps.ec}"
# Ponga PRUEBAS=1 para usar el entorno de staging de Let's Encrypt: los
# certificados no son válidos en el navegador, pero no consumen el límite de
# 5 intentos por semana mientras ajusta la configuración.
PRUEBAS="${PRUEBAS:-0}"

cd "$(dirname "$0")/.."

echo "▸ Dominio:  $DOMINIO"
echo "▸ Contacto: $CORREO"
[ "$PRUEBAS" = "1" ] && echo "▸ Modo PRUEBAS (staging): el certificado no será de confianza"
echo ""

RUTA="/etc/letsencrypt/live/$DOMINIO"

# --------------------- 1. Certificado temporal autofirmado ---------------------
echo "▸ 1/4 Instalando un certificado temporal para que NGINX pueda arrancar…"
docker compose run --rm --entrypoint sh certbot -c "
  mkdir -p '$RUTA' /var/www/certbot
  if [ ! -f '$RUTA/fullchain.pem' ]; then
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout '$RUTA/privkey.pem' \
      -out '$RUTA/fullchain.pem' \
      -subj '/CN=$DOMINIO' 2>/dev/null
    echo '  certificado temporal creado'
  else
    echo '  ya existe un certificado, se conserva'
  fi
"

# ------------------------------ 2. Levantar NGINX ------------------------------
echo "▸ 2/4 Levantando la aplicación y NGINX…"
docker compose --profile proxy up -d --build biocaps nginx

echo "  esperando a que NGINX responda por el puerto 80…"
for _ in $(seq 1 30); do
  if curl -sf -o /dev/null "http://localhost/.well-known/acme-challenge/prueba" \
     || curl -s -o /dev/null -w '%{http_code}' http://localhost/ | grep -qE '30[12]|200'; then
    break
  fi
  sleep 2
done

# ----------------------- 3. Sustituir por el certificado real -----------------------
echo "▸ 3/4 Solicitando el certificado a Let's Encrypt…"
BANDERA_PRUEBAS=""
[ "$PRUEBAS" = "1" ] && BANDERA_PRUEBAS="--staging"

docker compose run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
  -d "$DOMINIO" \
  --email "$CORREO" \
  --agree-tos --no-eff-email \
  --force-renewal $BANDERA_PRUEBAS

# ------------------------------ 4. Recargar NGINX ------------------------------
echo "▸ 4/4 Recargando NGINX con el certificado definitivo…"
docker compose exec nginx nginx -s reload

echo ""
echo "✓ Listo. Compruebe: https://$DOMINIO"
echo ""
echo "  Ahora active la cookie segura en el archivo .env:"
echo "      BIOCAPS_COOKIE_SEGURA=true"
echo "      BIOCAPS_URL=https://$DOMINIO"
echo "  y reinicie la aplicación:"
echo "      docker compose --profile proxy up -d"
echo ""
echo "  La renovación es automática: el contenedor certbot la revisa cada 12 h."
