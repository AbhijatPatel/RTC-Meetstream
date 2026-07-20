import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { createUser, findUserByEmail } from "../utils/store.js";
import { signToken } from "../utils/jwt.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = createUser({ id: uuid(), name, email, passwordHash });

  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

export default router;
