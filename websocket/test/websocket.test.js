import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { after, before, test } from "node:test";
import WebSocket from "ws";

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
  const client = new WebSocket(`ws://127.0.0.1:${wsPort}`);

  return new Promise((resolve, reject) => {
    client.once("open", () => resolve(client));
    client.once("error", reject);
  });
}

function nextMessage(client) {
  return new Promise((resolve, reject) => {
    const onMessage = (data) => {
      cleanup();
      resolve(data.toString());
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      client.off("message", onMessage);
      client.off("error", onError);
    };

    client.on("message", onMessage);
    client.on("error", onError);
  });
}

function expectNoMessage(client, timeoutMs = 300) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);
    const onMessage = (data) => {
      cleanup();
      reject(new Error(`Expected no message, received: ${data.toString()}`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      client.off("message", onMessage);
    };

    client.on("message", onMessage);
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
    const message = nextMessage(client);
    client.send("Hello from test");

    assert.equal(await message, "Echo: Hello from test");
  } finally {
    client.close();
  }
});

test("team-scoped events are delivered only to subscribed clients", async () => {
  const teamClient = await connectClient();
  const otherClient = await connectClient();

  try {
    const teamSubscription = nextMessage(teamClient);
    teamClient.send(JSON.stringify({ type: "subscribe", teamIds: [3] }));
    assert.deepEqual(JSON.parse(await teamSubscription), {
      type: "subscription:updated",
      teamIds: [3],
    });

    const otherSubscription = nextMessage(otherClient);
    otherClient.send(JSON.stringify({ type: "subscribe", teamIds: [99] }));
    assert.deepEqual(JSON.parse(await otherSubscription), {
      type: "subscription:updated",
      teamIds: [99],
    });

    const deliveredMessage = nextMessage(teamClient);
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
    assert.deepEqual(JSON.parse(await deliveredMessage), {
      type: "notification",
      teamIds: [3],
      message: "Team 3 update",
    });
    await expectNoMessage(otherClient);
  } finally {
    teamClient.close();
    otherClient.close();
  }
});
