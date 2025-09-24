import express from "express";
import { pathToFileURL } from "url";
import pool from "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Root endpoint
app.get("/", (req, res) => {
  res.send("Hello from Backend!");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Only start the server if run directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, async () => {
    console.log(`Backend running on port ${PORT}`);

    // Just test DB connection
    try {
      const res = await pool.query("SELECT NOW()");
      console.log("✅ Connected to Postgres:", res.rows[0].now);
    } catch (err) {
      console.error("❌ DB connection error:", err.message);
    }
  });
}

export default app;
