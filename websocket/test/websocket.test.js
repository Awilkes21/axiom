import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { after, before, test } from "node:test";
import { io } from "socket.io-client";

let serverProcess;
let wsPort;
let healthPort;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHealth(url) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep waiting for the test server to finish booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Timed out waiting for websocket health endpoint.");
}

function connectClient() {
  const client = io(`http://127.0.0.1:${wsPort}`, {
    transports: ["websocket"],
  });

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      client.off("connect", onConnect);
      client.off("connect_error", onError);
    };
    const onConnect = () => {
      cleanup();
      resolve(client);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    client.on("connect", onConnect);
    client.on("connect_error", onError);
  });
}

function nextEvent(client, eventName) {
  return new Promise((resolve, reject) => {
    const onEvent = (event) => {
      cleanup();
      resolve(event);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      client.off(eventName, onEvent);
      client.off("connect_error", onError);
    };

    client.on(eventName, onEvent);
    client.on("connect_error", onError);
  });
}

function expectNoEvent(client, eventName, timeoutMs = 300) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);
    const onEvent = (event) => {
      cleanup();
      reject(new Error(`Expected no ${eventName} event, received: ${JSON.stringify(event)}`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      client.off(eventName, onEvent);
    };

    client.on(eventName, onEvent);
  });
}

before(async () => {
  [wsPort, healthPort] = await Promise.all([getFreePort(), getFreePort()]);

  serverProcess = spawn(process.execPath, ["src/index.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      WS_PORT: String(wsPort),
      WS_HEALTH_PORT: String(healthPort),
      LOG_LEVEL: "error",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await waitForHealth(`http://127.0.0.1:${healthPort}/health`);
});

after(() => {
  serverProcess?.kill();
});

test("health endpoint returns ok", async () => {
  const response = await fetch(`http://127.0.0.1:${healthPort}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("clients can connect and exchange test messages", async () => {
  const client = await connectClient();
  try {
    const message = nextEvent(client, "message");
    client.send("Hello from test");

    assert.equal(await message, "Echo: Hello from test");
  } finally {
    client.disconnect();
  }
});

test("team-scoped events are delivered only to subscribed clients", async () => {
  const teamClient = await connectClient();
  const otherClient = await connectClient();

  try {
    const teamSubscription = nextEvent(teamClient, "subscription:updated");
    teamClient.emit("subscribe", { teamIds: [3] });
    assert.deepEqual(await teamSubscription, {
      type: "subscription:updated",
      teamIds: [3],
    });

    const otherSubscription = nextEvent(otherClient, "subscription:updated");
    otherClient.emit("subscribe", { teamIds: [99] });
    assert.deepEqual(await otherSubscription, {
      type: "subscription:updated",
      teamIds: [99],
    });

    const deliveredMessage = nextEvent(teamClient, "realtime:event");
    const response = await fetch(`http://127.0.0.1:${healthPort}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "notification",
        teamIds: [3],
        message: "Team 3 update",
      }),
    });

    assert.equal(response.status, 202);
    assert.deepEqual(await deliveredMessage, {
      type: "notification",
      teamIds: [3],
      message: "Team 3 update",
    });
    await expectNoEvent(otherClient, "realtime:event");
  } finally {
    teamClient.disconnect();
    otherClient.disconnect();
  }
});
