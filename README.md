# Axiom

Axiom is a web application for esports logistics. Teams can manage rosters, schedule scrims, browse scrim requests, and receive realtime updates.

[![Build Status](https://github.com/Awilkes21/axiom/actions/workflows/ci.yml/badge.svg)](https://github.com/Awilkes21/axiom/actions/workflows/ci.yml)

## Services

- `frontend`: Next.js app at `http://localhost:3000`
- `backend`: Express API at `http://localhost:4000`
- `websocket`: WebSocket server at `ws://localhost:5000`
- `websocket` health/events HTTP server at `http://localhost:5001`
- `db`: Postgres database at `localhost:5432`

## Environment Setup

Copy the example env files before running Docker:

```sh
cp db/.env.example db/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp websocket/.env.example websocket/.env
```

PowerShell equivalent:

```powershell
Copy-Item db/.env.example db/.env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
Copy-Item websocket/.env.example websocket/.env
```

For local Docker, the example values are enough to boot the stack. At minimum, confirm these values:

- `db/.env`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `backend/.env`: `DB_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `WEBSOCKET_EVENTS_URL`
- `frontend/.env`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
- `websocket/.env`: `WS_PORT`, `WS_HEALTH_PORT`, optional `WS_EVENTS_TOKEN`

If `WS_EVENTS_TOKEN` is set, set the same value as `WEBSOCKET_EVENTS_TOKEN` in `backend/.env`.

## Run Locally With Docker

Build and start everything:

```sh
docker compose up --build
```

Run in the background:

```sh
docker compose up -d --build
```

Run migrations and seed data:

```sh
docker compose run --rm backend npm run migrate
docker compose run --rm backend npm run seed
```

View logs:

```sh
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f websocket
```

Stop services:

```sh
docker compose down
```

Reset the database volume:

```sh
docker compose down -v
```

## Rebuild And Restart

Rebuild one service:

```sh
docker compose build backend
docker compose up -d backend
```

Rebuild the full stack:

```sh
docker compose build
docker compose up -d
```

Restart without rebuilding:

```sh
docker compose restart
docker compose restart backend
```

Pull fresh images and recreate containers:

```sh
docker compose pull
docker compose up -d --build --remove-orphans
```

## Local Development Without Docker

Install dependencies for the app you are working on:

```sh
cd backend
npm install
npm run dev
```

```sh
cd frontend
npm install
npm run dev
```

```sh
cd websocket
npm install
npm run dev
```

When running outside Docker, point `backend/.env` at a reachable Postgres instance and use localhost URLs for frontend/backend/websocket env values.

## Tests And Verification

Run backend tests:

```sh
docker compose exec backend npm test
```

Or locally:

```sh
cd backend
npm test
```

Build the frontend:

```sh
cd frontend
npm run build
```

Check service health:

```sh
curl http://localhost:4000/health
curl http://localhost:5001/health
```

## VPS Deployment

1. Install Docker Engine and the Docker Compose plugin on the VPS.
2. Clone the repository:

```sh
git clone https://github.com/Awilkes21/axiom.git
cd axiom
```

3. Create production env files from the examples:

```sh
cp db/.env.example db/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp websocket/.env.example websocket/.env
```

4. Update production values:

- Use a strong `JWT_SECRET`.
- Use strong Postgres credentials.
- Set `FRONTEND_ORIGIN` to the public frontend origin.
- Set `NEXT_PUBLIC_API_URL` to the public API origin.
- Set `NEXT_PUBLIC_WS_URL` to the public WebSocket URL, using `wss://` when HTTPS is enabled.
- Set matching `WS_EVENTS_TOKEN` and `WEBSOCKET_EVENTS_TOKEN` if protecting internal event publishes.

5. Start the stack:

```sh
docker compose up -d --build
docker compose run --rm backend npm run migrate
docker compose run --rm backend npm run seed
```

6. Confirm services:

```sh
docker compose ps
docker compose logs -f
```

For a production domain, put Nginx, Caddy, Traefik, or another reverse proxy in front of the app. The reverse proxy should route frontend traffic to `frontend:3000`, API traffic to `backend:4000`, and WebSocket traffic to `websocket:5000`.

## Continuous Integration

GitHub Actions runs on push and pull request to `main`. CI builds the containers, checks service health, and runs backend tests.

To run the workflow locally with `act`:

```sh
act push
```
