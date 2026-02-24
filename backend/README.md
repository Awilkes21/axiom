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
- `GET /teams/:teamId/scrims` returns calendar-friendly scrims for that team.
- `PATCH /teams/:teamId` updates a team.
- `DELETE /teams/:teamId` deletes a team.
- `POST /teams/:teamId/members` adds a team member.
- `PATCH /teams/:teamId/members/:accountId/role` updates a member role.
- `DELETE /teams/:teamId/members/:accountId` removes a team member.
- `POST /teams/:teamId/leave` removes your own membership from a team.
- `POST /scrims` creates a scrim request.
- `GET /scrims` lists scrims (supports `teamId` and `status` query filters).
- `PATCH /scrims/:scrimId` updates scrim details (teams/time).
- `POST /scrims/:scrimId/confirm` confirms a scrim.
- `POST /scrims/:scrimId/cancel` cancels a scrim.
- `GET /games` returns available games/titles.
- `GET /games/:gameId/roles` returns roles for a game slug (example: `counter-strike-2`).

Protected profile endpoints require:

```
Authorization: Bearer <jwt>
```

Permission model for team/scrim management endpoints:

- Team update/member changes require manager or admin role.
- Team delete is admin-only.
- Assigning/removing manager/admin roles is admin-only.
- Removing the last remaining team admin is blocked.
- Last admin cannot leave the team.
- Scrim create/update/confirm/cancel requires manager or admin access to at least one involved team.
- Teams support `visibility` (`public` or `private`), and private team reads are restricted to team members.

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
