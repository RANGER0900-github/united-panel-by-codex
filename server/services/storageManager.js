const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const MIN_FREE_BYTES = 1 * 1024 * 1024 * 1024;
const EXCLUDED_TYPES = new Set(["tmpfs", "devtmpfs", "overlay"]);

function listMounts() {
  const result = spawnSync("df", ["-B1", "-T"], { encoding: "utf8" });
  const lines = result.stdout.trim().split("\n").slice(1);

  const mounts = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const fstype = parts[1];
    const total = Number(parts[2] || 0);
    const used = Number(parts[3] || 0);
    const available = Number(parts[4] || 0);
    const mount = parts[6];

    if (EXCLUDED_TYPES.has(fstype)) continue;
    if (available < MIN_FREE_BYTES) continue;
    const isRoot =
      typeof process.getuid === "function" ? process.getuid() === 0 : false;
    if (isRoot) {
      try {
        fs.accessSync(mount, fs.constants.W_OK);
      } catch {
        continue;
      }
    }

    mounts.push({
      path: mount,
      free_gb: Number((available / (1024 ** 3)).toFixed(2)),
      total_gb: Number((total / (1024 ** 3)).toFixed(2)),
      recommended: false,
    });
  }

  if (mounts.length > 0) {
    const max = mounts.reduce((a, b) => (b.free_gb > a.free_gb ? b : a));
    max.recommended = true;
  }

  return mounts;
}

function validatePath(storagePath, requiredGb) {
  const mounts = listMounts();
  const target = mounts.find((m) => storagePath.startsWith(m.path));
  if (!target) return false;
  return target.free_gb >= requiredGb;
}

function provisionStorage(vpsId, basePath) {
  const root = path.join(basePath, "vpspanel-data", vpsId);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function destroyStorage(vpsId, basePath) {
  const root = path.join(basePath, "vpspanel-data");
  const target = path.join(root, vpsId);
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);

  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error("Invalid storage path");
  }

  fs.rmSync(resolvedTarget, { recursive: true, force: true });
}

module.exports = { listMounts, validatePath, provisionStorage, destroyStorage };
