# Axiom

A web application designed to make logistics in esports easier.  
Teams can book scrims and search for players, while individuals can advertise themselves through their own profiles.  
Includes shared calendars, real-time scrim invites, and notifications.

[![Build Status](https://github.com/Awilkes21/axiom/actions/workflows/ci.yml/badge.svg)](https://github.com/Awilkes21/axiom/actions/workflows/ci.yml)

# Axiom Development & CI Guide

## Running Locally with Docker

Start all services (frontend, backend, websocket, database):

    docker compose up --build

- Frontend → http://localhost:3000  
- Backend → http://localhost:4000  
- WebSocket → ws://localhost:5000  
- WebSocket health → http://localhost:5001/health  

Stop everything:

    docker compose down

Reset DB (fresh start):

    docker compose down -v

---

## Running Backend Tests

    docker compose exec backend npm test

---

## Continuous Integration (GitHub Actions)

CI runs on push and pull request to `main`. It will:

- Build and start all containers  
- Check health for frontend, backend, websocket  
- Run backend unit tests  

---

## Running CI Locally with `act`

Install [`act`](https://github.com/nektos/act):

- **Windows (Admin shell):**

      choco install act-cli

- **macOS:**

      brew install act

- **Linux:**

      # Download from releases
      https://github.com/nektos/act/releases

Run workflow locally:

    act push
