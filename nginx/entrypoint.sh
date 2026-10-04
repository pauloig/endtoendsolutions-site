#!/bin/sh
# Entrypoint del proxy: decide qué configuración cargar y garantiza que nginx
# pueda arrancar incluso antes de que exista un certificado válido.
set -e

DOMAIN="${SERVER_NAME:-endtoendsolutions.dev}"
TLS_ENABLED="${TLS_ENABLED:-0}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
CONF_OUT="/etc/nginx/conf.d/default.conf"
CONF_SRC="/etc/nginx/site-conf.d"

if [ "$TLS_ENABLED" = "1" ]; then
  CONF_TEMPLATE="$CONF_SRC/prod.conf"

  # Bootstrap: si aún no hay certificado (primera ejecución), genera uno
  # temporal para que nginx pueda arrancar y así certbot pueda emitir el real
  # vía webroot.
  if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
    echo "Certificado TLS no encontrado; generando uno temporal para el arranque..."

    if ! command -v openssl >/dev/null 2>&1; then
      apk add --no-cache openssl >/dev/null 2>&1 || true
    fi

    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout "$CERT_DIR/privkey.pem" \
      -out "$CERT_DIR/fullchain.pem" \
      -subj "/CN=$DOMAIN" >/dev/null 2>&1

    echo "Certificado temporal listo."
  fi

  # Recarga periódica para aplicar renovaciones emitidas por certbot.
  (
    while :; do
      sleep 6h
      nginx -s reload 2>/dev/null || true
    done
  ) &
else
  echo "TLS deshabilitado (TLS_ENABLED=$TLS_ENABLED); sirviendo HTTP en el puerto 80."
  CONF_TEMPLATE="$CONF_SRC/local.conf"
fi

sed "s/@SERVER_NAME@/$DOMAIN/g" "$CONF_TEMPLATE" > "$CONF_OUT"
echo "Configuración cargada desde $(basename "$CONF_TEMPLATE") para $DOMAIN"

exec nginx -g "daemon off;"