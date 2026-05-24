import { logger } from "./logger.service.js";

export async function publishRealtimeEvent(event) {
  const eventsUrl = process.env.WEBSOCKET_EVENTS_URL;
  if (!eventsUrl) {
    return;
  }

  const headers = { "Content-Type": "application/json" };
  if (process.env.WEBSOCKET_EVENTS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.WEBSOCKET_EVENTS_TOKEN}`;
  }

  try {
    const response = await fetch(eventsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      logger.warn("Realtime publish returned non-success status", {
        statusCode: response.status,
        eventType: event.type,
      });
      return;
    }

    logger.info("Realtime event published", { eventType: event.type });
  } catch (error) {
    logger.error("Realtime publish failed", error, { eventType: event.type });
  }
}
