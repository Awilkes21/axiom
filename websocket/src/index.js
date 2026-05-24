import http from "http";
import { Server } from "socket.io";
import { logger } from "./logger.js";

const WS_PORT = Number(process.env.WS_PORT || 5000);
const WS_HEALTH_PORT = Number(process.env.WS_HEALTH_PORT || 5001);
const WS_EVENTS_TOKEN = process.env.WS_EVENTS_TOKEN;
const BROADCAST_EVENT_TYPES = new Set([
  "notification",
  "scrim:created",
  "scrim:updated",
  "scrim:confirmed",
  "scrim:canceled",
]);

const io = new Server(WS_PORT, {
  cors: {
    origin: "*",
  },
});

function getScopedTeamIds(event) {
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

  return scopedTeamIds;
}

function broadcastRealtimeEvent(event) {
  let deliveredCount = 0;
  const scopedTeamIds = getScopedTeamIds(event);

  for (const socket of io.sockets.sockets.values()) {
    const hasMatchingSubscription =
      scopedTeamIds.size === 0 ||
      [...scopedTeamIds].some((teamId) => socket.data.subscribedTeamIds?.has(teamId));

    if (hasMatchingSubscription) {
      socket.emit("realtime:event", event);
      deliveredCount += 1;
    }
  }

  logger.info("Broadcast realtime event", {
    eventType: event.type,
    deliveredCount,
    connectedClients: io.engine.clientsCount,
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

io.on("connection", (socket) => {
  socket.data.subscribedTeamIds = new Set();
  logger.info("Socket.io client connected", { connectedClients: io.engine.clientsCount });

  socket.on("subscribe", (payload = {}) => {
    socket.data.subscribedTeamIds = toTeamSubscriptionSet(payload.teamIds);
    logger.info("Updated Socket.io client subscriptions", {
      subscribedTeamIds: [...socket.data.subscribedTeamIds],
    });
    socket.emit("subscription:updated", {
      type: "subscription:updated",
      teamIds: [...socket.data.subscribedTeamIds],
    });
  });

  socket.on("message", (message) => {
    if (typeof message === "string") {
      logger.debug("Received Socket.io test message", { byteLength: message.length });
      socket.emit("message", `Echo: ${message}`);
      return;
    }

    const event = message;
    logger.info("Received Socket.io event", { eventType: event?.type });
    if (BROADCAST_EVENT_TYPES.has(event?.type)) {
      broadcastRealtimeEvent(event);
      return;
    }

    logger.warn("Rejected unsupported Socket.io event", { eventType: event?.type });
    socket.emit("realtime:event", { type: "error", message: "Unsupported event type." });
  });

  socket.on("disconnect", () => {
    logger.info("Socket.io client disconnected", { connectedClients: io.engine.clientsCount });
  });

  socket.on("error", (error) => {
    logger.error("Socket.io client error", error);
  });
});

logger.info("Socket.io server started", { port: WS_PORT });

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

        broadcastRealtimeEvent(event);
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
  logger.info("Socket.io health server started", { port: WS_HEALTH_PORT });
});
