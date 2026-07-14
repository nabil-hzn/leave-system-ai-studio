import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "leave-system.db");

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    picture TEXT,
    role TEXT NOT NULL DEFAULT 'requester'
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    shift TEXT NOT NULL CHECK(shift IN ('morning','afternoon','night')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    reason TEXT,
    remark TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_leave_date_shift ON leave_requests(date, shift);
`);

const leaveColumns = db.prepare("PRAGMA table_info(leave_requests)").all() as { name: string }[];
if (!leaveColumns.some((c) => c.name === "remark")) {
  db.exec("ALTER TABLE leave_requests ADD COLUMN remark TEXT");
}

const userColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
if (!userColumns.some((c) => c.name === "email")) {
  db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)");
}
if (!userColumns.some((c) => c.name === "picture")) {
  db.exec("ALTER TABLE users ADD COLUMN picture TEXT");
}

const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insert = db.prepare("INSERT INTO users (name) VALUES (?)");
  for (const name of ["Alice Tan", "Bob Rahman", "Carol Lim", "David Ong"]) {
    insert.run(name);
  }
}
