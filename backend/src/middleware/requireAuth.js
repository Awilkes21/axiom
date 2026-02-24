import jwt from "jsonwebtoken";

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required." });
  }

  try {
    const decoded = jwt.verify(token, req.app.locals.jwtSecret);
    req.auth = {
      accountId: Number(decoded.sub),
      email: decoded.email,
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}
