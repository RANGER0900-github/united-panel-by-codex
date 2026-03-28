const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const metadata = {
  security_level: "medium",
  performance: "high",
  ram_overhead_mb: 50,
  needs_kvm: false,
  best_for: "General purpose containers",
  description: "LXC provides OS-level virtualization with lightweight isolation.",
};

const isRoot =
  typeof process.getuid === "function" ? process.getuid() === 0 : false;

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${cmd} failed`);
  }
  return result.stdout;
}

function isAvailable() {
  return spawnSync("which", ["lxc-create"]).status === 0;
}

function create(config) {
  if (!isRoot) return;
  run("lxc-create", [
    "-n",
    config.id,
    "-t",
    "download",
    "--",
    "-d",
    "ubuntu",
    "-r",
    "noble",
    "-a",
    "amd64",
  ]);

  const cfgPath = path.join("/var/lib/lxc", config.id, "config");
  const memBytes = config.ram_mb * 1024 * 1024;

  fs.appendFileSync(
    cfgPath,
    `\nlxc.cgroup2.memory.max = ${memBytes}\n` +
      `lxc.cgroup.memory.limit_in_bytes = ${memBytes}\n`,
  );

  run("lxc-start", ["-n", config.id]);
}

function start(id) {
  if (!isRoot) return;
  run("lxc-start", ["-n", id]);
}

function stop(id) {
  if (!isRoot) return;
  run("lxc-stop", ["-n", id]);
}

function reboot(id) {
  stop(id);
  start(id);
}

function del(id) {
  if (!isRoot) return;
  run("lxc-destroy", ["-n", id, "-f"]);
}

function findCgroupPath(id) {
  const candidates = [
    `/sys/fs/cgroup/lxc.payload.${id}`,
    `/sys/fs/cgroup/lxc/${id}`,
    `/sys/fs/cgroup/${id}`,
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function stats(id) {
  let ramUsedMb = 0;
  let cpuPercent = 0;
  let netRxBps = 0;
  let netTxBps = 0;

  try {
    const info = run("lxc-info", ["-n", id]);
    const memLine = info
      .split("\n")
      .find((line) => line.toLowerCase().startsWith("memory use"));
    if (memLine) {
      const match = memLine.match(/([0-9.]+)\s*([kmgt]i?b)/i);
      if (match) {
        const value = Number(match[1]);
        const unit = match[2].toLowerCase();
        const factor = unit.startsWith("g")
          ? 1024
          : unit.startsWith("m")
            ? 1
            : unit.startsWith("k")
              ? 1 / 1024
              : 1 / (1024 * 1024);
        ramUsedMb = value * factor;
      }
    }
  } catch (err) {
    // Best-effort only.
  }

  try {
    const cgroupPath = findCgroupPath(id);
    if (cgroupPath) {
      const memCurrent = path.join(cgroupPath, "memory.current");
      if (fs.existsSync(memCurrent)) {
        const bytes = Number(fs.readFileSync(memCurrent, "utf8").trim());
        if (!Number.isNaN(bytes)) {
          ramUsedMb = bytes / (1024 * 1024);
        }
      }
    }
  } catch (err) {
    // ignore
  }

  return {
    cpu_percent: cpuPercent,
    ram_used_mb: Math.round(ramUsedMb),
    net_rx_bps: netRxBps,
    net_tx_bps: netTxBps,
  };
}

function exec(id, command) {
  if (!isRoot) {
    return { stdout: "", stderr: "", exit_code: 0 };
  }
  if (!/^[a-zA-Z0-9_\-./\s]+$/.test(command)) {
    throw new Error("Command contains unsafe characters");
  }
  const parts = command.trim().split(/\s+/);
  if (parts.length === 0) {
    throw new Error("Command is empty");
  }
  const result = spawnSync(
    "lxc-attach",
    ["-n", id, "--", ...parts],
    { encoding: "utf8" },
  );
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exit_code: result.status ?? 1,
  };
}

module.exports = {
  name: "lxc",
  metadata,
  isAvailable,
  create,
  start,
  stop,
  reboot,
  delete: del,
  stats,
  exec,
};
