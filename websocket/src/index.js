import { WebSocketServer } from "ws";
import http from "http";

const WS_PORT = process.env.WS_PORT || 5000;
const WS_HEALTH_PORT = process.env.WS_HEALTH_PORT || 5001;

// WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    console.log(`Received: ${message}`);
    ws.send(`Echo: ${message}`);
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
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(WS_HEALTH_PORT, () => {
  console.log(`Health check endpoint running on port ${WS_HEALTH_PORT}`);
});
