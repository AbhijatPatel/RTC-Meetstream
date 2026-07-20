import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "..", "..", "db.json");

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// NOTE: this file-based store is fine for local dev and demos. Swap it for a
// real database (Postgres, Mongo, etc.) before running this anywhere real —
// concurrent writes here are not safe under load.

export function findUserByEmail(email) {
  const db = readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id) {
  const db = readDb();
  return db.users.find((u) => u.id === id);
}

export function createUser(user) {
  const db = readDb();
  db.users.push(user);
  writeDb(db);
  return user;
}
