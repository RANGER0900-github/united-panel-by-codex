const fs = require("fs");
const path = require("path");

const primaryPath = "/opt/vpspanel/config/config.json";
const devPath = path.resolve(process.cwd(), "config", "config.dev.json");

function loadFromFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

let rawConfig = loadFromFile(primaryPath);
let configSource = rawConfig ? "primary" : "env";

if (!rawConfig) {
  rawConfig = loadFromFile(devPath);
  if (rawConfig) {
    configSource = "dev";
  }
}

if (!rawConfig) {
  rawConfig = {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    jwt_secret: process.env.JWT_SECRET,
    db_path: process.env.DB_PATH,
    data_dir: process.env.DATA_DIR,
    log_level: process.env.LOG_LEVEL,
  };
}

const config = {
  port: Number(rawConfig.port || 3000),
  jwt_secret: rawConfig.jwt_secret,
  db_path: rawConfig.db_path || path.resolve(process.cwd(), "data", "panel.db"),
  data_dir: rawConfig.data_dir || path.resolve(process.cwd(), "data"),
  log_level: rawConfig.log_level || "info",
};

const insecureSecrets = new Set(["dev-secret-change-in-production"]);

if (!config.jwt_secret || (configSource !== "dev" && insecureSecrets.has(config.jwt_secret))) {
  throw new Error(
    "Missing or insecure jwt_secret. Set a strong secret in config.json or JWT_SECRET.",
  );
}

module.exports = config;
