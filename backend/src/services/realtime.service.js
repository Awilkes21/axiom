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
      console.warn(`Realtime publish failed with status ${response.status}.`);
    }
  } catch (error) {
    console.warn("Realtime publish failed:", error);
  }
}
