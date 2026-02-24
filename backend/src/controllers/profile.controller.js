import bcrypt from "bcryptjs";
import { toUserDto } from "../services/auth.service.js";

export async function getProfileHandler(req, res) {
  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      "SELECT id, email, display_name FROM accounts WHERE id = $1",
      [req.auth.accountId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ user: toUserDto(result.rows[0]) });
  } catch (error) {
    console.error("Fetch profile failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function patchProfileHandler(req, res) {
  const { email, displayName, password } = req.body ?? {};
  const hasAnyField =
    email !== undefined || displayName !== undefined || password !== undefined;

  if (!hasAnyField) {
    return res.status(400).json({ message: "At least one field is required." });
  }

  if (email !== undefined && (typeof email !== "string" || !email.includes("@"))) {
    return res.status(400).json({ message: "A valid email is required." });
  }

  if (password !== undefined && (typeof password !== "string" || password.length < 8)) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long." });
  }

  try {
    const passwordHash =
      password !== undefined ? await bcrypt.hash(password, 12) : null;
    const db = req.app.locals.pool;
    const result = await db.query(
      `UPDATE accounts
       SET email = COALESCE($2, email),
           display_name = COALESCE($3, display_name),
           password_hash = COALESCE($4, password_hash)
       WHERE id = $1
       RETURNING id, email, display_name`,
      [req.auth.accountId, email ?? null, displayName ?? null, passwordHash],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ user: toUserDto(result.rows[0]) });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Email is already registered." });
    }

    console.error("Update profile failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function deleteProfileHandler(req, res) {
  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      "DELETE FROM accounts WHERE id = $1 RETURNING id",
      [req.auth.accountId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "Profile deleted." });
  } catch (error) {
    console.error("Delete profile failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}
