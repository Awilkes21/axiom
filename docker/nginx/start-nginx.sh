#!/bin/sh
set -eu

CERT_DIR=/etc/nginx/certs
CERT_FILE="$CERT_DIR/local-dev.crt"
KEY_FILE="$CERT_DIR/local-dev.key"

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "Generating local self-signed HTTPS certificate for nginx..."
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
fi
