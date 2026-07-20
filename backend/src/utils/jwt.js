import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret";
const TOKEN_TTL = "12h";

export function signToken(user) {
  return jwt.sign({ sub: user.id, name: user.name, email: user.email }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
