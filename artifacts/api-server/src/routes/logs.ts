import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { GetLogsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const LOG_SOURCES = ["host-detector", "instance-manager", "network", "storage", "scheduler", "api-server"];
const LOG_MESSAGES = {
  info: [
    "Instance {id} started successfully",
    "Health check passed",
    "Capability detection completed",
    "Network interface eth0 online",
    "SSH key exchange completed",
    "Metrics collection updated",
    "Instance {id} reported healthy",
    "API server accepting connections",
    "Storage mount point verified",
    "IPv4 connectivity confirmed",
    "Scheduler cycle completed",
    "Instance {id} memory within limits",
  ],
  warn: [
    "High CPU usage detected: {pct}%",
    "Memory usage approaching limit",
    "Disk usage at {pct}%",
    "Network latency spike detected",
    "Instance {id} restart count elevated",
    "KVM capability check failed (not critical)",
    "Public IPv4 detection slow",
  ],
  error: [
    "Failed to start instance {id}: timeout",
    "KVM device not accessible",
    "Disk mount failed for /dev/sdb",
    "Network bridge failed to initialize",
    "Instance {id} exited unexpectedly",
  ],
  debug: [
    "Polling metrics endpoint",
    "Capability cache refreshed",
    "Scheduler heartbeat",
    "DB connection pool: 3/10 active",
    "Route handler invoked: GET /api/metrics",
    "Zod validation passed",
  ],
};

interface LogEntry {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  instanceId?: string;
  source: string;
}

let generatedLogs: LogEntry[] = [];

function generateLog(): LogEntry {
  const levels: ("debug" | "info" | "warn" | "error")[] = ["debug", "info", "info", "info", "warn", "error"];
  const level = levels[Math.floor(Math.random() * levels.length)]!;
  const messages = LOG_MESSAGES[level];
  const message = messages[Math.floor(Math.random() * messages.length)]!
    .replace("{id}", `inst-${Math.random().toString(36).slice(2, 6)}`)
    .replace("{pct}", String(Math.floor(Math.random() * 40) + 60));
  const source = LOG_SOURCES[Math.floor(Math.random() * LOG_SOURCES.length)]!;

  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    message,
    instanceId: Math.random() > 0.5 ? `inst-${Math.random().toString(36).slice(2, 6)}` : undefined,
    source,
  };
}

for (let i = 0; i < 80; i++) {
  const log = generateLog();
  log.timestamp = new Date(Date.now() - (80 - i) * 15000).toISOString();
  generatedLogs.push(log);
}

setInterval(() => {
  generatedLogs.push(generateLog());
  if (generatedLogs.length > 1000) {
    generatedLogs = generatedLogs.slice(-1000);
  }
}, 8000);

router.get("/", (req, res) => {
  const limit = parseInt(String(req.query["limit"] ?? "100"), 10) || 100;
  const level = req.query["level"] as string | undefined;
  const instanceId = req.query["instanceId"] as string | undefined;

  let filtered = generatedLogs;

  if (level) {
    filtered = filtered.filter((l) => l.level === level);
  }

  if (instanceId) {
    filtered = filtered.filter((l) => l.instanceId === instanceId);
  }

  const sliced = filtered.slice(-limit);

  const data = GetLogsResponse.parse({
    logs: sliced,
    total: filtered.length,
  });

  res.json(data);
});

export default router;
