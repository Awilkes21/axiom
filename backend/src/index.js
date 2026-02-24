import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pathToFileURL } from "url";
import pool from "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.locals.pool = pool;
app.locals.jwtSecret = DEFAULT_JWT_SECRET;

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

function createAuthToken(payload, jwtSecret) {
  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
}

function toUserDto(accountRow) {
  return {
    id: accountRow.id,
    email: accountRow.email,
    displayName: accountRow.display_name,
  };
}

// Root endpoint
app.get("/", (req, res) => {
  res.send("Hello from Backend!");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/auth/signup", async (req, res) => {
  const { email, password, displayName } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ message: "A valid email is required." });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long." });
  }

  try {
    const db = req.app.locals.pool;
    const existingAccountResult = await db.query(
      "SELECT id FROM accounts WHERE email = $1",
      [email],
    );

    if (existingAccountResult.rowCount > 0) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const insertResult = await db.query(
      `INSERT INTO accounts (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name`,
      [email, passwordHash, displayName ?? null],
    );

    const account = insertResult.rows[0];
    const token = createAuthToken(
      { sub: String(account.id), email: account.email },
      req.app.locals.jwtSecret,
    );

    return res.status(201).json({
      token,
      user: toUserDto(account),
    });
  } catch (error) {
    console.error("Signup failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const db = req.app.locals.pool;
    const accountResult = await db.query(
      "SELECT id, email, password_hash, display_name FROM accounts WHERE email = $1",
      [email],
    );

    if (accountResult.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const account = accountResult.rows[0];
    const passwordMatches = await bcrypt.compare(password, account.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = createAuthToken(
      { sub: String(account.id), email: account.email },
      req.app.locals.jwtSecret,
    );

    return res.status(200).json({
      token,
      user: toUserDto(account),
    });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
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
