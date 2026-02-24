import jwt from "jsonwebtoken";

export function createAuthToken(payload, jwtSecret) {
  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
}

export function toUserDto(accountRow) {
  return {
    id: accountRow.id,
    email: accountRow.email,
    displayName: accountRow.display_name,
    bio: accountRow.bio ?? null,
    timezone: accountRow.timezone ?? null,
    discordHandle: accountRow.discord_handle ?? null,
  };
}
