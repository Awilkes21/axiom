FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY nginx.conf /etc/nginx/nginx.conf
COPY start-nginx.sh /docker-entrypoint.d/99-generate-local-cert.sh

RUN chmod +x /docker-entrypoint.d/99-generate-local-cert.sh
