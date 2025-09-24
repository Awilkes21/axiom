import express from "express";
import { pathToFileURL } from "url";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 4000;


// --- Database connection ---
const pool = new Pool({
  connectionString: process.env.DB_URL,
});

async function testDb() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Connected to Postgres:", res.rows[0].now);
  } catch (err) {
    console.error("❌ DB connection error:", err.message);
    process.exit(1);
  }
}
testDb();
// ----------------------------

// Root endpoint
app.get('/', (req, res) => {
  res.send('Hello from Backend!');
});

// Health check endpoint for CI tests
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Only start the server if run directly (not when required in tests)
if (import.meta.url === pathToFileURL(process.argv[1]).href)  {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

export default app;

