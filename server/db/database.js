const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const Database = require("better-sqlite3");
const config = require("../config");

const dbPath = config.db_path;
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
const schemaPath = path.join(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();

if (userCount.count === 0) {
  const adminPassword = crypto.randomBytes(12).toString("base64");
  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  const now = Math.floor(Date.now() / 1000);
  const adminId = uuidv4();

  db.prepare(
    "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(adminId, "admin", passwordHash, "admin", now);

  const configDir = path.resolve(process.cwd(), "config");
  const credsPath = path.join(configDir, "credentials.txt");

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(credsPath, `admin:${adminPassword}\n`, { mode: 0o600 });
  fs.chmodSync(credsPath, 0o600);
}

module.exports = { db };
