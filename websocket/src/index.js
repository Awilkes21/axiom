import { WebSocket, WebSocketServer } from "ws";
import http from "http";

const WS_PORT = process.env.WS_PORT || 5000;
const WS_HEALTH_PORT = process.env.WS_HEALTH_PORT || 5001;
const WS_EVENTS_TOKEN = process.env.WS_EVENTS_TOKEN;
const BROADCAST_EVENT_TYPES = new Set([
  "notification",
  "scrim:created",
  "scrim:updated",
  "scrim:confirmed",
  "scrim:canceled",
]);

// WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

function broadcastJson(event) {
  const payload = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function isAuthorized(req) {
  if (!WS_EVENTS_TOKEN) {
    return true;
  }

  return req.headers.authorization === `Bearer ${WS_EVENTS_TOKEN}`;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    const rawMessage = message.toString();
    console.log(`Received: ${rawMessage}`);

    try {
      const event = JSON.parse(rawMessage);
      if (BROADCAST_EVENT_TYPES.has(event.type)) {
        broadcastJson(event);
        return;
      }

      ws.send(JSON.stringify({ type: "error", message: "Unsupported event type." }));
    } catch {
      ws.send(`Echo: ${rawMessage}`);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log(`WebSocket server running on port ${WS_PORT}`);

// Lightweight HTTP health check server
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  } else if (req.url === "/events" && req.method === "POST") {
    if (!isAuthorized(req)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Unauthorized." }));
      return;
    }

    readJsonBody(req)
      .then((event) => {
        if (!BROADCAST_EVENT_TYPES.has(event.type)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Unsupported event type." }));
          return;
        }

        broadcastJson(event);
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ accepted: true }));
      })
      .catch(() => {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid JSON body." }));
      });
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(WS_HEALTH_PORT, () => {
  console.log(`Health check endpoint running on port ${WS_HEALTH_PORT}`);
});
