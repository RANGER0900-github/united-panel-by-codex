const fs = require("fs");
const { spawnSync } = require("child_process");

const HISTORY_LIMIT = 60;
const history = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readProcStat() {
  const lines = fs.readFileSync("/proc/stat", "utf8").split("\n");
  const cpuLine = lines.find((line) => line.startsWith("cpu "));
  if (!cpuLine) return null;
  const parts = cpuLine.trim().split(/\s+/).slice(1).map(Number);
  const total = parts.reduce((a, b) => a + b, 0);
  const idle = parts[3] + (parts[4] || 0);
  return { total, idle };
}

async function getCpuPercent() {
  const first = readProcStat();
  await sleep(500);
  const second = readProcStat();
  if (!first || !second) return 0;
  const totalDelta = second.total - first.total;
  const idleDelta = second.idle - first.idle;
  if (totalDelta === 0) return 0;
  return Math.max(0, Math.min(100, ((totalDelta - idleDelta) / totalDelta) * 100));
}

function getMemory() {
  const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
  const totalMatch = meminfo.match(/^MemTotal:\s+(\d+)\s+kB/m);
  const availMatch = meminfo.match(/^MemAvailable:\s+(\d+)\s+kB/m);
  const totalKb = totalMatch ? Number(totalMatch[1]) : 0;
  const availKb = availMatch ? Number(availMatch[1]) : 0;
  const usedKb = Math.max(0, totalKb - availKb);
  return {
    ram_total_mb: Math.round(totalKb / 1024),
    ram_used_mb: Math.round(usedKb / 1024),
  };
}

function getDisk() {
  const result = spawnSync("df", ["-h"], { encoding: "utf8" });
  const lines = result.stdout.trim().split("\n").slice(1);
  const mounts = lines.map((line) => {
    const parts = line.split(/\s+/);
    return {
      filesystem: parts[0],
      size: parts[1],
      used: parts[2],
      avail: parts[3],
      use_percent: parts[4],
      mount: parts[5],
    };
  });

  const total = spawnSync("df", ["-B1", "/"], { encoding: "utf8" })
    .stdout.trim().split("\n")[1];
  const totalParts = total ? total.split(/\s+/) : [];
  const totalBytes = Number(totalParts[1] || 0);
  const usedBytes = Number(totalParts[2] || 0);

  return {
    disk_total_gb: Math.round(totalBytes / (1024 ** 3)),
    disk_used_gb: Math.round(usedBytes / (1024 ** 3)),
    mounts,
  };
}

function readNetDev() {
  const lines = fs.readFileSync("/proc/net/dev", "utf8").split("\n").slice(2);
  let rx = 0;
  let tx = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const [iface, data] = line.split(":");
    if (iface.trim() === "lo") continue;
    const parts = data.trim().split(/\s+/).map(Number);
    rx += parts[0] || 0;
    tx += parts[8] || 0;
  }
  return { rx, tx };
}

async function getNetworkBps() {
  const first = readNetDev();
  await sleep(500);
  const second = readNetDev();
  const rxBps = (second.rx - first.rx) * 2;
  const txBps = (second.tx - first.tx) * 2;
  return {
    net_rx_bps: Math.max(0, rxBps),
    net_tx_bps: Math.max(0, txBps),
  };
}

function getUptime() {
  const content = fs.readFileSync("/proc/uptime", "utf8").trim();
  return Number(content.split(" ")[0]) || 0;
}

function getLoadAvg() {
  const content = fs.readFileSync("/proc/loadavg", "utf8").trim();
  return Number(content.split(" ")[0]) || 0;
}

async function getHostMetrics() {
  const cpuPercent = await getCpuPercent();
  const memory = getMemory();
  const disk = getDisk();
  const network = await getNetworkBps();
  const uptime = getUptime();
  const load = getLoadAvg();

  return {
    cpu_percent: cpuPercent,
    ...memory,
    ...disk,
    ...network,
    uptime_seconds: uptime,
    load_avg_1m: load,
  };
}

function startMetricsEmitter(io) {
  setInterval(async () => {
    try {
      const data = await getHostMetrics();
      history.push({ ...data, timestamp: Date.now() });
      while (history.length > HISTORY_LIMIT) history.shift();
      io.emit("metrics", data);
    } catch (err) {
      console.error("metrics emitter error:", err.message);
    }
  }, 3000);
}

module.exports = { getHostMetrics, startMetricsEmitter, history };
