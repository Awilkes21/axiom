import express from "express";
import { pathToFileURL } from "url";
import pool, { runMigrations } from "./db.js";

const app = express();
const PORT = process.env.PORT;


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


// --- Database connection + migrations ---
async function initDb(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      // Run migrations before testing queries
      await runMigrations();

      const res = await pool.query("SELECT NOW()");
      console.log("✅ Connected to Postgres:", res.rows[0].now);
      return;
    } catch (err) {
      console.error(`❌ DB not ready (attempt ${i + 1}):`, err.message);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay));
      } else {
        process.exit(1);
      }
    }
  }
}
initDb();
// ----------------------------


export default app;