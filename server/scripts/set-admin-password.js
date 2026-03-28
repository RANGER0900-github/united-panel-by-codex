const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const installDir = path.resolve(__dirname, "..", "..");
const configPath = path.join(installDir, "config", "config.json");

if (!fs.existsSync(configPath)) {
  console.error("Missing config.json. Is VPS Panel installed?");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const schemaPath = path.join(installDir, "server", "db", "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");

let password = process.argv[2];
if (!password) {
  password = crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

const db = new Database(config.db_path);
db.exec(schema);
const hash = bcrypt.hashSync(password, 10);
const existing = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
if (existing) {
  db.prepare("UPDATE users SET password_hash = ? WHERE username = ?").run(hash, "admin");
} else {
  db.prepare("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?,?,?,?,?)")
    .run(crypto.randomUUID(), "admin", hash, "admin", Math.floor(Date.now() / 1000));
}
db.close();

const credsPath = path.join(installDir, "config", "credentials.txt");
fs.writeFileSync(credsPath, `admin:${password}\n`);
fs.chmodSync(credsPath, 0o600);

if (process.env.SILENT !== "1") {
  console.log(`Admin password updated: ${password}`);
}
