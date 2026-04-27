import jwt from "jsonwebtoken";

const HARDCODED_USER = {
  email: "admin@gmail.com",
  password: "123456",
};

/**
 * POST /auth/login
 * Body: { email, password }
 */
export function login(req, res) {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password are required" });
  }

  if (
    email !== HARDCODED_USER.email ||
    password !== HARDCODED_USER.password
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const token = jwt.sign(
    { sub: "admin", email: HARDCODED_USER.email },
    secret,
    { expiresIn: "1h" }
  );

  return res.json({
    token,
    tokenType: "Bearer",
    expiresIn: 3600,
  });
}
