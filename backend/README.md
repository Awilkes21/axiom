# Axiom Backend

Express.js API (Node.js, Postgres) served via Docker.

## Running Locally

Start with Docker:

    docker compose up backend db --build

Backend will be available at:

    http://localhost:4000

## Development (without Docker)

    cd backend
    npm install
    npm run dev

## Testing

Run tests:

    docker compose exec backend npm test

Or locally:

    npm test

## API Endpoints

- `GET /` → `"Hello from Backend!"`  
- `GET /health` → `{ "status": "ok" }`

## Migrations

```
docker compose run --rm backend npm run migrate
```
