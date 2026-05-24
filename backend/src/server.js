import app from "./app.js";
import pool from "./db.js";
import { logger } from "./services/logger.service.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  logger.info("Backend server started", { port: Number(PORT) });

  try {
    const res = await pool.query("SELECT NOW()");
    logger.info("Connected to Postgres", { databaseTime: res.rows[0].now });
  } catch (err) {
    logger.error("DB connection failed", err);
  }
});
