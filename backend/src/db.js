import { Pool } from "pg";
import fs from "fs";
import path from "path";

const pool = new Pool({
  connectionString: process.env.DB_URL,
});

export async function runMigrations() {
  const fs = await import("fs");
  const path = await import("path");

  const migrationsDir = path.resolve("./migrations");

  try {
    const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

    for (const file of files){
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`🚀 Running migration: ${file}`);
      await pool.query(sql);
    }

    console.log("✅ All migrations applied")
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

export default pool;
