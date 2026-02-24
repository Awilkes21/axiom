import app from "./app.js";
import pool from "./db.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);

  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Connected to Postgres:", res.rows[0].now);
  } catch (err) {
    console.error("DB connection error:", err.message);
  }
});
