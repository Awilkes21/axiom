import bcrypt from "bcryptjs";
import { createAuthToken, toUserDto } from "../services/auth.service.js";

export async function signupHandler(req, res) {
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
       RETURNING id, email, display_name, bio, timezone, discord_handle`,
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
}

export async function loginHandler(req, res) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const db = req.app.locals.pool;
    const accountResult = await db.query(
      `SELECT id, email, password_hash, display_name, bio, timezone, discord_handle
       FROM accounts
       WHERE email = $1`,
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
}
