import jwt from "jsonwebtoken";

/**
 * Expects: Authorization: Bearer <token>
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError" ? "Token expired" : "Invalid or expired token";
    return res.status(401).json({ error: msg });
  }
}
