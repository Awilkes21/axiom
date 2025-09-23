const express = require('express');
const app = express();

const PORT = process.env.PORT || 4000;

// Root endpoint
app.get('/', (req, res) => {
  res.send('Hello from Backend!');
});

// Health check endpoint for CI tests
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Only start the server if run directly (not when required in tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

module.exports = app;
