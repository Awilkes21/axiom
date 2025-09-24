import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import pool from "./db.js";

export async function runMigrations() {
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

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  runMigrations();
}