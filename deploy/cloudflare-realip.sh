#!/usr/bin/env bash
# ============================================================================
# BioCaps Monitor® — Recuperar la IP real del visitante detrás de Cloudflare
#
# Con Cloudflare en modo proxy, NGINX ve la IP de Cloudflare y no la del
# visitante. Sin esta configuración:
#   · el limitador de intentos de acceso trataría a todos los usuarios como
#     una sola IP y un bloqueo afectaría a todo el mundo;
#   · el histórico registraría siempre la misma procedencia.
#
# El módulo real_ip sustituye $remote_addr por el valor de CF-Connecting-IP,
# pero SÓLO cuando la petición viene de un rango declarado de Cloudflare, de
# modo que nadie pueda falsificar su IP enviando esa cabecera a mano.
#
# Ejecutar como root y repetir cada pocos meses: Cloudflare cambia sus rangos.
#   sudo ./deploy/cloudflare-realip.sh
# ============================================================================
set -euo pipefail

DESTINO=/etc/nginx/conf.d/cloudflare-realip.conf

if [ "$(id -u)" -ne 0 ]; then
  echo "Ejecute con sudo: sudo $0" >&2
  exit 1
fi

echo "▸ Descargando los rangos de Cloudflare…"
V4=$(curl -fsS https://www.cloudflare.com/ips-v4)
V6=$(curl -fsS https://www.cloudflare.com/ips-v6)

if [ -z "$V4" ] || [ -z "$V6" ]; then
  echo "No se pudieron obtener los rangos. Se conserva la configuración actual." >&2
  exit 1
fi

{
  echo "# Generado por deploy/cloudflare-realip.sh el $(date -Iseconds)"
  echo "# Rangos oficiales: https://www.cloudflare.com/ips/"
  echo ""
  while read -r rango; do [ -n "$rango" ] && echo "set_real_ip_from $rango;"; done <<< "$V4"
  while read -r rango; do [ -n "$rango" ] && echo "set_real_ip_from $rango;"; done <<< "$V6"
  echo ""
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > "$DESTINO"

echo "▸ Escrito $DESTINO ($(grep -c set_real_ip_from "$DESTINO") rangos)"

nginx -t && systemctl reload nginx
echo "✓ NGINX recargado: ya registra la IP real del visitante."
