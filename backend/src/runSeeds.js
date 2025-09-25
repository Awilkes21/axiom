import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import pool from "./db.js";

async function runSeeds() {
  const seedsDir = path.resolve("./seeds");

  try {
    const files = fs
      .readdirSync(seedsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`🌱 Running seed: ${file}`);
      await pool.query(sql);
    }

    console.log("✅ All seeds applied");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
    runSeeds();
}