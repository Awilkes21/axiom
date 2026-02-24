# Axiom Frontend

Next.js app (App Router, Tailwind) served via Docker.

## Folder Structure

    src/
      app/
        dashboard/
          page.tsx
        layout.tsx
        page.tsx
      components/
        layout/
          page-shell.tsx
      lib/
        api/
          client.ts
          health.ts
      types/
        api.ts

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
