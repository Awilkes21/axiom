import { WebSocket, WebSocketServer } from "ws";
import http from "http";
import { logger } from "./logger.js";

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
const CLIENT_CONTROL_EVENT_TYPES = new Set(["subscribe"]);

// WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

function broadcastJson(event) {
  let deliveredCount = 0;
  const payload = JSON.stringify(event);
  const scopedTeamIds = new Set();

  if (Number.isInteger(event.teamId)) {
    scopedTeamIds.add(event.teamId);
  }
  for (const teamId of event.teamIds ?? []) {
    if (Number.isInteger(teamId)) {
      scopedTeamIds.add(teamId);
    }
  }
  if (Number.isInteger(event.scrim?.team1Id)) {
    scopedTeamIds.add(event.scrim.team1Id);
  }
  if (Number.isInteger(event.scrim?.team2Id)) {
    scopedTeamIds.add(event.scrim.team2Id);
  }

  for (const client of wss.clients) {
    const hasMatchingSubscription =
      scopedTeamIds.size === 0 ||
      [...scopedTeamIds].some((teamId) => client.subscribedTeamIds?.has(teamId));

    if (client.readyState === WebSocket.OPEN && hasMatchingSubscription) {
      client.send(payload);
      deliveredCount += 1;
    }
  }
  logger.info("Broadcast realtime event", {
    eventType: event.type,
    deliveredCount,
    connectedClients: wss.clients.size,
    scopedTeamIds: [...scopedTeamIds],
  });
}

function toTeamSubscriptionSet(teamIds) {
  if (!Array.isArray(teamIds)) {
    return new Set();
  }

  return new Set(teamIds.filter((teamId) => Number.isInteger(teamId)));
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
  ws.subscribedTeamIds = new Set();
  logger.info("WebSocket client connected", { connectedClients: wss.clients.size });

  ws.on("message", (message) => {
    const rawMessage = message.toString();

    try {
      const event = JSON.parse(rawMessage);
      logger.info("Received WebSocket event", { eventType: event.type });
      if (CLIENT_CONTROL_EVENT_TYPES.has(event.type)) {
        ws.subscribedTeamIds = toTeamSubscriptionSet(event.teamIds);
        logger.info("Updated WebSocket client subscriptions", {
          subscribedTeamIds: [...ws.subscribedTeamIds],
        });
        ws.send(
          JSON.stringify({
            type: "subscription:updated",
            teamIds: [...ws.subscribedTeamIds],
          }),
        );
        return;
      }

      if (BROADCAST_EVENT_TYPES.has(event.type)) {
        broadcastJson(event);
        return;
      }

      logger.warn("Rejected unsupported WebSocket event", { eventType: event.type });
      ws.send(JSON.stringify({ type: "error", message: "Unsupported event type." }));
    } catch {
      logger.debug("Received non-JSON WebSocket message", { byteLength: rawMessage.length });
      ws.send(`Echo: ${rawMessage}`);
    }
  });

  ws.on("close", () => {
    logger.info("WebSocket client disconnected", { connectedClients: wss.clients.size });
  });

  ws.on("error", (error) => {
    logger.error("WebSocket client error", error);
  });
});

logger.info("WebSocket server started", { port: Number(WS_PORT) });

// Lightweight HTTP health check server
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  } else if (req.url === "/events" && req.method === "POST") {
    if (!isAuthorized(req)) {
      logger.warn("Rejected unauthorized realtime publish");
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Unauthorized." }));
      return;
    }

    readJsonBody(req)
      .then((event) => {
        if (!BROADCAST_EVENT_TYPES.has(event.type)) {
          logger.warn("Rejected unsupported realtime publish event", { eventType: event.type });
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Unsupported event type." }));
          return;
        }

        broadcastJson(event);
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ accepted: true }));
      })
      .catch((error) => {
        logger.warn("Rejected invalid realtime publish body", { errorMessage: error.message });
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid JSON body." }));
      });
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(WS_HEALTH_PORT, () => {
  logger.info("WebSocket health server started", { port: Number(WS_HEALTH_PORT) });
});
