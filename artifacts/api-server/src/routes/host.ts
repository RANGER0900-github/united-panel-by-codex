import { Router, type IRouter } from "express";
import { execSync } from "child_process";
import os from "os";
import fs from "fs";
import {
  GetHostCapabilitiesResponse,
  GetHostInfoResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function detectSystemd(): boolean {
  try {
    execSync("systemctl --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function detectKvm(): boolean {
  try {
    return fs.existsSync("/dev/kvm");
  } catch {
    return false;
  }
}

function detectDocker(): boolean {
  try {
    execSync("docker --version", { stdio: "pipe" });
    return true;
  } catch {
    try {
      return fs.existsSync("/var/run/docker.sock");
    } catch {
      return false;
    }
  }
}

function detectPublicIpv4(): boolean {
  try {
    const result = execSync("curl -s --max-time 3 https://ipinfo.io/ip", {
      stdio: "pipe",
    }).toString().trim();
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(result);
  } catch {
    return false;
  }
}

function detectVirtualization(): boolean {
  try {
    const result = execSync("systemd-detect-virt 2>/dev/null || cat /proc/1/environ 2>/dev/null | tr '\\0' '\\n' | grep -i container || echo 'none'", {
      stdio: "pipe",
      shell: true,
    }).toString().trim();
    return result !== "none" && result !== "";
  } catch {
    return false;
  }
}

function detectHostMode(): "bare-metal" | "vm" | "container" | "unknown" {
  try {
    const result = execSync("systemd-detect-virt 2>/dev/null || echo unknown", {
      stdio: "pipe",
      shell: true,
    }).toString().trim();
    if (result === "none") return "bare-metal";
    if (["docker", "lxc", "podman", "container"].some((c) => result.includes(c))) return "container";
    if (["kvm", "vmware", "qemu", "virtualbox", "hyper-v", "xen"].some((v) => result.includes(v))) return "vm";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function detectMountPoints(): string[] {
  try {
    const mounts = fs.readFileSync("/proc/mounts", "utf8").split("\n");
    return mounts
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(" ")[1])
      .filter((mp): mp is string => !!mp && !mp.startsWith("/proc") && !mp.startsWith("/sys") && !mp.startsWith("/dev"))
      .slice(0, 5);
  } catch {
    return ["/"];
  }
}

function getPublicIp(): string {
  try {
    return execSync("curl -s --max-time 3 https://ipinfo.io/ip", {
      stdio: "pipe",
    }).toString().trim();
  } catch {
    return "";
  }
}

router.get("/capabilities", (_req, res) => {
  const systemd = detectSystemd();
  const kvm = detectKvm();
  const docker = detectDocker();
  const publicIpv4 = detectPublicIpv4();
  const virtualization = detectVirtualization();
  const mountPoints = detectMountPoints();
  const hostMode = detectHostMode();

  const data = GetHostCapabilitiesResponse.parse({
    systemd,
    kvm,
    docker,
    publicIpv4,
    virtualization,
    mountPoints,
    detectedAt: new Date().toISOString(),
    hostMode,
    startupMode: systemd ? "systemd" : "manual",
    accessMode: publicIpv4 ? "direct" : "nat",
  });

  res.json(data);
});

router.get("/info", (_req, res) => {
  const cpus = os.cpus();
  const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);

  let diskGb = 100;
  try {
    const df = execSync("df -BG / | tail -1 | awk '{print $2}'", {
      stdio: "pipe",
      shell: true,
    }).toString().trim().replace("G", "");
    diskGb = parseFloat(df) || 100;
  } catch {}

  const data = GetHostInfoResponse.parse({
    hostname: os.hostname(),
    os: `${os.type()} ${os.release()}`,
    kernel: os.release(),
    arch: os.arch(),
    cpuCount: cpus.length,
    totalMemoryMb: totalMemMb,
    totalDiskGb: diskGb,
    publicIp: getPublicIp() || undefined,
    uptime: os.uptime(),
  });

  res.json(data);
});

export default router;
