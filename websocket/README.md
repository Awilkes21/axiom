# Axiom WebSocket

WebSocket echo server + HTTP health endpoint.

## Running Locally

Start with Docker:

    docker compose up websocket --build

Services:

- WebSocket server → ws://localhost:5000  
- Health check → http://localhost:5001/health

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

Quick test from browser console:

```js
const ws = new WebSocket("ws://localhost:5000");
ws.onopen = () => ws.send("Hello from browser");
ws.onmessage = (e) => console.log("Message:", e.data);
