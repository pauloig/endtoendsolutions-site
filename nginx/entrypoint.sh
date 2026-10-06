#!/bin/sh
# Proxy entrypoint: decides which configuration to load and makes sure nginx
# can start even before a valid certificate exists.
set -e

DOMAIN="${SERVER_NAME:-endtoendsolutions.dev}"
TLS_ENABLED="${TLS_ENABLED:-0}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
CONF_OUT="/etc/nginx/conf.d/default.conf"
CONF_SRC="/etc/nginx/site-conf.d"

if [ "$TLS_ENABLED" = "1" ]; then
  CONF_TEMPLATE="$CONF_SRC/prod.conf"

  # Bootstrap: on first run there is no certificate yet, so generate a
  # temporary one to let nginx start and certbot issue the real one over
  # the webroot.
  if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
    echo "No TLS certificate found; generating a temporary one to boot..."

    if ! command -v openssl >/dev/null 2>&1; then
      apk add --no-cache openssl >/dev/null 2>&1 || true
    fi

    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout "$CERT_DIR/privkey.pem" \
      -out "$CERT_DIR/fullchain.pem" \
      -subj "/CN=$DOMAIN" >/dev/null 2>&1

    echo "Temporary certificate ready."
  fi

  # Periodic reload to apply renewals issued by certbot.
  (
    while :; do
      sleep 6h
      nginx -s reload 2>/dev/null || true
    done
  ) &
else
  echo "TLS disabled (TLS_ENABLED=$TLS_ENABLED); serving HTTP on port 80."
  CONF_TEMPLATE="$CONF_SRC/local.conf"
fi

sed "s/@SERVER_NAME@/$DOMAIN/g" "$CONF_TEMPLATE" > "$CONF_OUT"
echo "Configuration loaded from $(basename "$CONF_TEMPLATE") for $DOMAIN"

exec nginx -g "daemon off;"