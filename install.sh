#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR=/opt/vpspanel
LOG_DIR=$INSTALL_DIR/logs
INSTALL_LOG=$LOG_DIR/install.log
mkdir -p "$INSTALL_DIR" "$LOG_DIR"
exec > >(tee -a "$INSTALL_LOG") 2>&1

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✓ $*"; }
warn() { echo "[$(date '+%H:%M:%S')] ⚠ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ✗ $*"; exit 1; }

# ── SECTION 1: PREFLIGHT ─────────────────────────────────────
log "Checking prerequisites..."
[ "$(id -u)" = "0" ] || fail "Must run as root. Try: sudo bash install.sh"

if source /etc/os-release 2>/dev/null; then
  ok "OS: ${ID:-unknown} ${VERSION_ID:-unknown}"
else
  warn "Cannot detect OS (missing /etc/os-release). Proceeding best-effort."
fi

PKG_MGR="none"
if command -v apt-get >/dev/null 2>&1; then
  PKG_MGR="apt"
elif command -v dnf >/dev/null 2>&1; then
  PKG_MGR="dnf"
elif command -v yum >/dev/null 2>&1; then
  PKG_MGR="yum"
elif command -v pacman >/dev/null 2>&1; then
  PKG_MGR="pacman"
elif command -v apk >/dev/null 2>&1; then
  PKG_MGR="apk"
elif command -v zypper >/dev/null 2>&1; then
  PKG_MGR="zypper"
else
  warn "No supported package manager found. Skipping system package installs."
fi

FREE_KB=$(df / | awk 'NR==2{print $4}')
[ "$FREE_KB" -gt $((10*1024*1024)) ] || warn "Low disk space: less than 10GB free"

if [ -f "$INSTALL_DIR/config/config.json" ]; then
  warn "Existing installation detected at $INSTALL_DIR"
  if [ "${AUTO_UPGRADE:-}" = "1" ]; then
    ok "AUTO_UPGRADE=1 set; continuing with upgrade."
  else
    read -rp "Upgrade? [y/N]: " UPGRADE
    [ "$UPGRADE" = "y" ] || fail "Aborted."
  fi
fi

# ── SECTION 2: SYSTEM PACKAGES ───────────────────────────────
if [ "${SKIP_SYSTEM_PACKAGES:-}" = "1" ]; then
  warn "Skipping system package installation (SKIP_SYSTEM_PACKAGES=1)"
else
  log "Installing system packages..."
fi
case "$PKG_MGR" in
  apt)
    if [ "${SKIP_SYSTEM_PACKAGES:-}" = "1" ]; then
      :
    else
      while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
        log "Waiting for dpkg lock..."; sleep 3
      done
      export DEBIAN_FRONTEND=noninteractive
      if ! apt-get update -qq; then
        warn "apt-get update failed; continuing without system package install."
      elif ! apt-get install -y -qq --no-install-recommends \
        curl wget git jq lsof net-tools iproute2 \
        ca-certificates gnupg iptables nftables \
        build-essential lxc lxcfs lxc-templates rsync; then
        warn "apt-get install failed; continuing with existing packages."
      fi
    fi
    ;;
  dnf)
    if [ "${SKIP_SYSTEM_PACKAGES:-}" != "1" ]; then
      dnf -y -q upgrade || true
      dnf -y -q install \
        curl wget git jq lsof net-tools iproute \
        ca-certificates gnupg2 iptables nftables \
        make gcc gcc-c++ lxc lxcfs rsync || warn "dnf install failed; continuing."
    fi
    ;;
  yum)
    if [ "${SKIP_SYSTEM_PACKAGES:-}" != "1" ]; then
      yum -y -q update || true
      yum -y -q install \
        curl wget git jq lsof net-tools iproute \
        ca-certificates gnupg2 iptables nftables \
        make gcc gcc-c++ lxc lxcfs rsync || warn "yum install failed; continuing."
    fi
    ;;
  pacman)
    if [ "${SKIP_SYSTEM_PACKAGES:-}" != "1" ]; then
      pacman -Sy --noconfirm
      pacman -S --noconfirm \
        curl wget git jq lsof net-tools iproute2 \
        ca-certificates gnupg iptables nftables \
        base-devel lxc rsync || warn "pacman install failed; continuing."
    fi
    ;;
  apk)
    if [ "${SKIP_SYSTEM_PACKAGES:-}" != "1" ]; then
      apk update
      apk add \
        curl wget git jq lsof net-tools iproute2 \
        ca-certificates gnupg iptables nftables \
        build-base lxc rsync || warn "apk add failed; continuing."
    fi
    ;;
  zypper)
    if [ "${SKIP_SYSTEM_PACKAGES:-}" != "1" ]; then
      zypper -n refresh
      zypper -n install \
        curl wget git jq lsof net-tools iproute2 \
        ca-certificates gpg2 iptables nftables \
        gcc gcc-c++ make lxc rsync || warn "zypper install failed; continuing."
    fi
    ;;
  *)
    warn "Skipping system package install; continue with existing tools."
    ;;
esac
ok "System packages installed (or skipped)"

# ── SECTION 3: NODE.JS ───────────────────────────────────────
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node --version)
  ok "Node.js already installed ($NODE_VER)"
else
  log "Installing Node.js LTS..."
  case "$PKG_MGR" in
    apt)
      curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - >/dev/null 2>&1
      apt-get install -y -qq nodejs
      ;;
    dnf|yum)
      curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash - >/dev/null 2>&1
      ${PKG_MGR} -y -q install nodejs
      ;;
    pacman)
      pacman -S --noconfirm nodejs npm
      ;;
    apk)
      apk add nodejs npm
      ;;
    zypper)
      zypper -n install nodejs npm
      ;;
    *)
      fail "Node.js is required but no supported package manager was found."
      ;;
  esac
  NODE_VER=$(node --version)
  ok "Node.js $NODE_VER"
fi

# ── SECTION 4: LXC SERVICE ───────────────────────────────────
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable lxcfs >/dev/null 2>&1 || true
  systemctl start lxcfs >/dev/null 2>&1 || warn "lxcfs could not start (non-fatal)"
  ok "LXC ready"
else
  warn "systemctl not available; skipping lxcfs service management."
fi

# ── SECTION 5: OPTIONAL — gVisor ─────────────────────────────
install_gvisor() {
  curl -fsSL https://gvisor.dev/archive.key | \
    gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] \
    https://storage.googleapis.com/gvisor/releases release main" \
    > /etc/apt/sources.list.d/gvisor.list
  apt-get update -qq && apt-get install -y -qq runsc
  ok "gVisor (runsc) installed"
}
if [ "$PKG_MGR" = "apt" ] && [ "${SKIP_SYSTEM_PACKAGES:-}" != "1" ]; then
  install_gvisor 2>/dev/null || warn "gVisor unavailable on this host — skipping"
else
  warn "gVisor install is only automated for apt-based systems — skipping"
fi

# ── SECTION 6: OPTIONAL — Sysbox ─────────────────────────────
install_sysbox() {
  SYSBOX_VER="0.6.4"
  SYSBOX_DEB="sysbox-ce_${SYSBOX_VER}-0.linux_amd64.deb"
  wget -q "https://github.com/nestybox/sysbox/releases/download/v${SYSBOX_VER}/${SYSBOX_DEB}"
  apt-get install -y -qq ./$SYSBOX_DEB
  rm -f $SYSBOX_DEB
  ok "Sysbox installed"
}
if [ "$PKG_MGR" = "apt" ] && [ "${SKIP_SYSTEM_PACKAGES:-}" != "1" ]; then
  install_sysbox 2>/dev/null || warn "Sysbox unavailable on this host — skipping"
else
  warn "Sysbox install is only automated for apt-based systems — skipping"
fi

# ── SECTION 7: CLOUDFLARED ───────────────────────────────────
log "Installing cloudflared..."
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) CF_ARCH="amd64" ;;
  aarch64|arm64) CF_ARCH="arm64" ;;
  armv7l|armv6l) CF_ARCH="arm" ;;
  *) CF_ARCH="amd64" ;;
esac
if [ "$PKG_MGR" = "apt" ] && [ "${SKIP_SYSTEM_PACKAGES:-}" != "1" ] && command -v gpg >/dev/null 2>&1; then
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | \
    gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
  if [ -n "${VERSION_CODENAME:-}" ]; then
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
      https://pkg.cloudflare.com/cloudflared $VERSION_CODENAME main" \
      > /etc/apt/sources.list.d/cloudflared.list
    apt-get update -qq && apt-get install -y -qq cloudflared
  else
    warn "VERSION_CODENAME missing; falling back to binary install."
    wget -q "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$CF_ARCH" \
      -O /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared
  fi
else
  CF_TMP=$(mktemp)
  wget -q "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$CF_ARCH" \
    -O "$CF_TMP"
  chmod +x "$CF_TMP"
  mv -f "$CF_TMP" /usr/local/bin/cloudflared
fi
ok "cloudflared installed"

# ── SECTION 8: COPY SOURCE + BUILD ───────────────────────────
log "Deploying panel source..."
rsync -a --exclude='node_modules' --exclude='.git' \
  --exclude='screenshots' --exclude='tests' \
  "$(dirname "$(realpath "$0")")/" "$INSTALL_DIR/"

cd "$INSTALL_DIR"
JS_PKG="npm"
if command -v pnpm >/dev/null 2>&1; then
  JS_PKG="pnpm"
elif command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true
  if command -v pnpm >/dev/null 2>&1; then
    JS_PKG="pnpm"
  fi
fi

if [ "$JS_PKG" = "pnpm" ]; then
  CI=true pnpm install --prod
else
  npm install --production --silent
fi

if [ -f "$INSTALL_DIR/server/package.json" ]; then
  (cd "$INSTALL_DIR/server" && npm install --omit=dev --silent)
fi
ok "Backend dependencies installed"

# Build frontend
FRONTEND_DIR="artifacts/vps-panel"
cd "$INSTALL_DIR/$FRONTEND_DIR"
if [ "$JS_PKG" = "pnpm" ]; then
  CI=true pnpm install
  BASE_PATH=/ PORT=5173 VITE_API_URL="" pnpm run build
else
  npm install --silent
  BASE_PATH=/ PORT=5173 VITE_API_URL="" npm run build
fi
ok "Frontend built"
cd "$INSTALL_DIR"

# ── SECTION 9: GENERATE CONFIG ───────────────────────────────
log "Generating configuration..."
mkdir -p "$INSTALL_DIR/config" "$INSTALL_DIR/data"

JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASS=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)

cat > "$INSTALL_DIR/config/config.json" << EOF
{
  "port": 3000,
  "jwt_secret": "$JWT_SECRET",
  "db_path": "$INSTALL_DIR/data/panel.db",
  "data_dir": "$INSTALL_DIR/data",
  "log_level": "info"
}
EOF
chmod 600 "$INSTALL_DIR/config/config.json"

echo "admin:$ADMIN_PASS" > "$INSTALL_DIR/config/credentials.txt"
chmod 600 "$INSTALL_DIR/config/credentials.txt"
ok "Config generated"

# ── SECTION 10: NETWORK DETECTION ────────────────────────────
log "Detecting network mode..."
MY_IP=$(curl -s --max-time 5 https://ifconfig.io 2>/dev/null || echo "")
MY_IP2=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "")

is_private() {
  echo "$1" | grep -qE '^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)'
}

if [ -n "$MY_IP" ] && [ "$MY_IP" = "$MY_IP2" ] && ! is_private "$MY_IP"; then
  NETWORK_MODE="public"
  PUBLIC_IP="$MY_IP"
else
  NETWORK_MODE="tunnel"
  PUBLIC_IP=""
fi

echo "NETWORK_MODE=$NETWORK_MODE" > "$INSTALL_DIR/config/network.conf"
echo "PUBLIC_IP=$PUBLIC_IP" >> "$INSTALL_DIR/config/network.conf"
ok "Network mode: $NETWORK_MODE"

# ── SECTION 11: SYSTEM USER ──────────────────────────────────
id vpspanel &>/dev/null || useradd -r -s /bin/false -d "$INSTALL_DIR" vpspanel
# LXC and networking still need root — run as root for now
# TODO: reduce privileges in a future hardening pass

# ── SECTION 12: SYSTEMD SERVICE ──────────────────────────────
NODE_BIN=$(command -v node || true)
if [ -z "$NODE_BIN" ]; then
  fail "Node.js not found after install."
fi

if command -v systemctl >/dev/null 2>&1; then
  cat > /etc/systemd/system/vpspanel.service << EOF
[Unit]
Description=VPS Management Panel
After=network.target lxcfs.service
Wants=lxcfs.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_BIN $INSTALL_DIR/server/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable vpspanel
  systemctl start vpspanel
  ok "Service started (systemd)"
else
  warn "systemctl not available; starting panel in background."
  nohup "$NODE_BIN" "$INSTALL_DIR/server/index.js" >> "$LOG_DIR/panel.log" 2>&1 &
  echo $! > "$INSTALL_DIR/vpspanel.pid"
  ok "Service started (nohup, pid: $(cat "$INSTALL_DIR/vpspanel.pid"))"
fi

# ── SECTION 13: HEALTH CHECK ─────────────────────────────────
log "Waiting for panel to become healthy..."
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    ok "Panel is healthy"
    break
  fi
  [ "$i" -lt 5 ] && { log "Attempt $i/5 — retrying in 5s..."; sleep 5; } || \
    { fail "Panel failed to start. Check logs for details."; }
done

# ── SECTION 14: SUCCESS OUTPUT ───────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  VPS Panel installed successfully!"
echo "════════════════════════════════════════════════"
if [ "$NETWORK_MODE" = "public" ]; then
  echo "  URL:      http://$PUBLIC_IP:3000"
else
  echo "  URL:      http://localhost:3000 (local only)"
fi
echo "  Credentials: $INSTALL_DIR/config/credentials.txt"
if command -v systemctl >/dev/null 2>&1; then
  echo "  Logs:     journalctl -u vpspanel -f"
  echo "  Status:   systemctl status vpspanel"
else
  echo "  Logs:     tail -f $LOG_DIR/panel.log"
  echo "  Status:   ps -p $(cat "$INSTALL_DIR/vpspanel.pid")"
fi
echo "  Uninstall: systemctl disable --now vpspanel && rm -rf $INSTALL_DIR"
echo "════════════════════════════════════════════════"
if [ "$NETWORK_MODE" = "tunnel" ]; then
  echo ""
  echo "  ⚠  No public IPv4 detected."
  echo "  For remote access, run:"
  echo "  cloudflared tunnel --url http://localhost:3000"
  echo ""
fi
