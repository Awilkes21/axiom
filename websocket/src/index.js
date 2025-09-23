const WebSocket = require('ws');

const PORT = process.env.WS_PORT || 5000;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log(`Received: ${message}`);
    ws.send(`Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log(`WebSocket server running on port ${PORT}`);
