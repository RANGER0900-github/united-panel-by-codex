const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const metadata = {
  security_level: "high",
  needs_kvm: false,
  best_for: "Docker-in-Docker, Kubernetes-in-container",
  description: "Sysbox enables system container workloads with strong isolation.",
};

function run(args) {
  const result = spawnSync("sysbox-runc", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || "sysbox-runc failed");
  }
  return result.stdout;
}

function isAvailable() {
  return spawnSync("which", ["sysbox-runc"]).status === 0;
}

function bundlePathFor(idOrConfig) {
  if (typeof idOrConfig === "object" && idOrConfig.bundle_path) {
    return idOrConfig.bundle_path;
  }
  const id = typeof idOrConfig === "string" ? idOrConfig : idOrConfig?.id;
  return path.resolve(process.cwd(), "data", "sysbox", id || "unknown");
}

function create(config) {
  const bundlePath = bundlePathFor(config);
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Sysbox bundle not found at ${bundlePath}`);
  }
  run(["create", "--bundle", bundlePath, config.id]);
  run(["start", config.id]);
}

function start(id) {
  run(["start", id]);
}

function stop(id) {
  run(["kill", id, "SIGTERM"]);
}

function reboot(id) {
  stop(id);
  start(id);
}

function del(id) {
  run(["delete", id]);
}

function stats() {
  return {
    cpu_percent: 0,
    ram_used_mb: 0,
    net_rx_bps: 0,
    net_tx_bps: 0,
  };
}

function exec(id, command) {
  if (!/^[a-zA-Z0-9_\-./\s]+$/.test(command)) {
    throw new Error("Command contains unsafe characters");
  }
  const parts = command.trim().split(/\s+/);
  if (parts.length === 0) {
    throw new Error("Command is empty");
  }
  const result = spawnSync("sysbox-runc", ["exec", id, ...parts], {
    encoding: "utf8",
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exit_code: result.status ?? 1,
  };
}

module.exports = {
  name: "sysbox",
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
