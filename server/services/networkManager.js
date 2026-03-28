const { spawnSync } = require("child_process");

function isPrivate(ip) {
  return (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) ||
    /^127\./.test(ip)
  );
}

function curlIp(url) {
  const res = spawnSync("curl", ["-s", "--max-time", "5", url], {
    encoding: "utf8",
  });
  if (res.status !== 0) return "";
  return res.stdout.trim();
}

function detectPublicIPv4() {
  const ip1 = curlIp("https://ifconfig.io");
  const ip2 = curlIp("https://api.ipify.org");

  if (ip1 && ip1 === ip2 && !isPrivate(ip1)) {
    return { mode: "public", ip: ip1 };
  }
  return { mode: "tunnel", ip: null };
}

function setupVPS() {
  return;
}

function teardownVPS() {
  return;
}

module.exports = { detectPublicIPv4, setupVPS, teardownVPS };
