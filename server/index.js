const path = require("path");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("./config");
const { db } = require("./db/database");
const driverRegistry = require("./drivers");
const { startMetricsEmitter } = require("./services/metrics");
const { startExpiryChecker } = require("./services/expiry");

const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const hostRoutes = require("./routes/host");
const driversRoutes = require("./routes/drivers");
const imagesRoutes = require("./routes/images");
const storageRoutes = require("./routes/storage");
const createVpsRoutes = require("./routes/vps");
const createLogsRoutes = require("./routes/logs");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,PATCH,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline'");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/host", hostRoutes);
app.use("/api/drivers", driversRoutes);
app.use("/api/images", imagesRoutes);
app.use("/api/storage", storageRoutes);
const vpsRoutes = createVpsRoutes(io, driverRegistry);
const logsRoutes = createLogsRoutes(driverRegistry);

app.use("/api/vps", vpsRoutes);
app.use("/api/vps", logsRoutes);

if (process.env.NODE_ENV === "production") {
  const frontendDir = path.join(__dirname, "../artifacts/vps-panel/dist/public");
  app.use(express.static(frontendDir));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });
}

io.use((socket, next) => {
  const token = socket.handshake.query?.token;
  if (!token) return next(new Error("Unauthorized"));
  try {
    const decoded = jwt.verify(token, config.jwt_secret);
    socket.user = decoded;
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

startMetricsEmitter(io);
startExpiryChecker(db, driverRegistry);

httpServer.listen(config.port, () => {
  console.log(`VPS Panel running on port ${config.port}`);
});
