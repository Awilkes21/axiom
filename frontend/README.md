# Axiom Frontend

Next.js app (App Router, Tailwind) served via Docker.

## Folder Structure

    src/
      app/
        dashboard/
          page.tsx
        login/
          page.tsx
        layout.tsx
        page.tsx
      components/
        feedback/
          async-state.tsx
        layout/
          page-shell.tsx
      hooks/
        use-backend-health.ts
      lib/
        api/
          client.ts
          endpoints.ts
          health.ts
        auth/
          token.ts
      types/
        api.ts
        domain.ts

## API Integration Conventions

- Use `apiFetch` from `src/lib/api/client.ts` for all HTTP calls.
- Pass `auth: true` for JWT-protected endpoints.
- For protected pages, set `redirectOnUnauthorized: true` to route to `/login` on 401.
- Handle loading/error/empty states in UI using `AsyncState` component.

## Running Locally

Start with Docker:

    docker compose up frontend --build

App will be available at:

    http://localhost:3000

## Development (without Docker)

    cd frontend
    npm install
    npm run dev

Visit:

    http://localhost:3000

## Useful Commands

Build:

    npm run build

Start production server:

    npm start
