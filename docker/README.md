# Docker Runbook

This project uses Docker Compose to run the frontend, backend, websocket server, and Postgres database.

## First Run

From the repository root:

```sh
cp db/.env.example db/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp websocket/.env.example websocket/.env
docker compose up -d --build
docker compose run --rm backend npm run migrate
docker compose run --rm backend npm run seed
```

PowerShell users can replace the `cp` commands with `Copy-Item`.

## Service URLs

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Backend health: `http://localhost:4000/health`
- WebSocket: `ws://localhost:5000`
- WebSocket health: `http://localhost:5001/health`
- Nginx HTTP entrypoint: `http://localhost:8080`
- Nginx HTTPS entrypoint: `https://localhost:8443`
- Backend through Nginx: `http://localhost:8080/api/health`
- WebSocket through Nginx: `ws://localhost:8080/ws`
- Postgres: `localhost:5432`

## Common Commands

```sh
docker compose ps
docker compose logs -f
docker compose logs -f backend
docker compose restart backend
docker compose build frontend
docker compose up -d frontend
docker compose down
docker compose down -v
```

Use `docker compose down -v` only when you want to delete the local database volume.

## Nginx Reverse Proxy

The `nginx` service fronts the app through one host:

- `/` proxies to the frontend.
- `/api/` proxies to the backend and strips the `/api` prefix.
- `/ws` proxies WebSocket upgrade traffic to the websocket service.

The container generates a self-signed local certificate at startup. Use:

```sh
curl http://localhost:8080/health
curl -k https://localhost:8443/health
curl -k https://localhost:8443/api/health
```

For frontend builds that should use the proxy instead of direct service ports, set:

```sh
NEXT_PUBLIC_API_URL=https://localhost:8443/api
NEXT_PUBLIC_WS_URL=wss://localhost:8443/ws
```

## Rebuild After Code Or Env Changes

```sh
docker compose build
docker compose up -d --remove-orphans
```

For one service:

```sh
docker compose build websocket
docker compose up -d websocket
```

## Database Maintenance

```sh
docker compose run --rm backend npm run migrate
docker compose run --rm backend npm run seed
docker compose exec db psql -U postgres -d axiom
```

Adjust the `psql` user and database names if `db/.env` uses different values.

## VPS Notes

On a VPS, keep env files out of git and set production-safe secrets. Run:

```sh
docker compose up -d --build
docker compose run --rm backend npm run migrate
```

Add a reverse proxy for public traffic. Route:

- `/` to `frontend:3000`
- `/api/` to `backend:4000`
- `/ws` WebSocket upgrade traffic to `websocket:5000`

Use HTTPS on the public proxy and set frontend websocket URLs to `wss://...`.
