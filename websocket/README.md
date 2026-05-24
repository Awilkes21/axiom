# Axiom WebSocket

Socket.io realtime server + HTTP health endpoint.

## Running Locally

Start with Docker:

    docker compose up websocket --build

Services:

- Socket.io server -> http://localhost:5000
- Health check -> http://localhost:5001/health
- Realtime publish endpoint -> http://localhost:5001/events

## Development (without Docker)

    cd websocket
    npm install
    node src/index.js

## Logging

WebSocket logs are JSON lines written to stdout/stderr.

Set `LOG_LEVEL` to control verbosity:

- `debug`
- `info` (default)
- `warn`
- `error`

Logs include server startup, client connects/disconnects, rejected events, and broadcast delivery counts.

## Testing

Run automated Socket.io tests:

```sh
npm test
```

Quick test from browser console after loading the Socket.io client:

```js
const socket = io("http://localhost:5000", { transports: ["websocket"] });
socket.on("message", console.log);
socket.on("connect", () => socket.send("Hello from browser"));
```
