const { spawnSync } = require("child_process");

const metadata = {
  security_level: "very high",
  performance: "low",
  ram_overhead_mb: 256,
  needs_kvm: false,
  best_for: "Maximum isolation when KVM unavailable, testing",
  description: "QEMU TCG provides full emulation without hardware acceleration (slow).",
};

function isAvailable() {
  return spawnSync("which", ["qemu-system-x86_64"]).status === 0;
}

function notImplemented() {
  throw new Error("QEMU TCG driver not configured in this build.");
}

function stats() {
  return {
    cpu_percent: 0,
    ram_used_mb: 0,
    net_rx_bps: 0,
    net_tx_bps: 0,
  };
}

module.exports = {
  name: "qemu_tcg",
  metadata,
  isAvailable,
  create: notImplemented,
  start: notImplemented,
  stop: notImplemented,
  reboot: notImplemented,
  delete: notImplemented,
  stats,
  exec: notImplemented,
};
