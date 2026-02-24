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

## Auth Endpoints

- `POST /auth/signup` creates an account and returns a JWT token.
- `POST /auth/login` validates credentials and returns a JWT token.
- `GET /profile` returns the authenticated user profile.
- `PATCH /profile` updates authenticated user profile fields.
- `DELETE /profile` deletes the authenticated user account.
- `POST /teams` creates a team.
- `GET /teams/:teamId` fetches team details and memberships.
- `PATCH /teams/:teamId` updates a team.
- `DELETE /teams/:teamId` deletes a team.
- `POST /teams/:teamId/members` adds a team member.
- `DELETE /teams/:teamId/members/:accountId` removes a team member.

Protected profile endpoints require:

```
Authorization: Bearer <jwt>
```

Example signup body:

```json
{
  "email": "player@example.com",
  "password": "password123",
  "displayName": "PlayerOne"
}
```

Example login body:

```json
{
  "email": "player@example.com",
  "password": "password123"
}
```

## Migrations

```
docker compose run --rm backend npm run migrate
```

## Seeds
```
docker compose run --rm backend npm run seed
```

## Login to database
```
docker compose run --rm db psql -h db -U $POSTGRES_USER -d $POSTGRES_DB
```
