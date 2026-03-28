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

source /etc/os-release 2>/dev/null || fail "Cannot detect OS"
case "$ID-$VERSION_ID" in
  ubuntu-20.04|ubuntu-22.04|ubuntu-24.04|debian-11|debian-12) ok "OS: $ID $VERSION_ID" ;;
  *) fail "Unsupported OS: $ID $VERSION_ID. Supported: Ubuntu 20.04+ or Debian 11+" ;;
esac

FREE_KB=$(df / | awk 'NR==2{print $4}')
[ "$FREE_KB" -gt $((10*1024*1024)) ] || warn "Low disk space: less than 10GB free"

if [ -f "$INSTALL_DIR/config/config.json" ]; then
  warn "Existing installation detected at $INSTALL_DIR"
  read -rp "Upgrade? [y/N]: " UPGRADE
  [ "$UPGRADE" = "y" ] || fail "Aborted."
fi

# ── SECTION 2: SYSTEM PACKAGES ───────────────────────────────
log "Installing system packages..."

# Wait for dpkg lock
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
  log "Waiting for dpkg lock..."; sleep 3
done

apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git jq lsof net-tools iproute2 \
  ca-certificates gnupg iptables nftables \
  build-essential lxc lxcfs lxc-templates
ok "System packages installed"

# ── SECTION 3: NODE.JS ───────────────────────────────────────
log "Installing Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs
NODE_VER=$(node --version)
ok "Node.js $NODE_VER"

# ── SECTION 4: LXC SERVICE ───────────────────────────────────
systemctl enable lxcfs >/dev/null 2>&1 || true
systemctl start lxcfs >/dev/null 2>&1 || warn "lxcfs could not start (non-fatal)"
ok "LXC ready"

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
install_gvisor 2>/dev/null || warn "gVisor unavailable on this host — skipping"

# ── SECTION 6: OPTIONAL — Sysbox ─────────────────────────────
install_sysbox() {
  SYSBOX_VER="0.6.4"
  SYSBOX_DEB="sysbox-ce_${SYSBOX_VER}-0.linux_amd64.deb"
  wget -q "https://github.com/nestybox/sysbox/releases/download/v${SYSBOX_VER}/${SYSBOX_DEB}"
  apt-get install -y -qq ./$SYSBOX_DEB
  rm -f $SYSBOX_DEB
  ok "Sysbox installed"
}
install_sysbox 2>/dev/null || warn "Sysbox unavailable on this host — skipping"

# ── SECTION 7: CLOUDFLARED ───────────────────────────────────
log "Installing cloudflared..."
ARCH=$(dpkg --print-architecture)
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | \
  gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
  https://pkg.cloudflare.com/cloudflared $VERSION_CODENAME main" \
  > /etc/apt/sources.list.d/cloudflared.list
apt-get update -qq && apt-get install -y -qq cloudflared || \
  (wget -q "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$ARCH" \
    -O /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared)
ok "cloudflared installed"

# ── SECTION 8: COPY SOURCE + BUILD ───────────────────────────
log "Deploying panel source..."
rsync -a --exclude='node_modules' --exclude='.git' \
  --exclude='screenshots' --exclude='tests' \
  "$(dirname "$(realpath "$0")")/" "$INSTALL_DIR/"

cd "$INSTALL_DIR"
npm install --production --silent
ok "Backend dependencies installed"

# Build frontend
FRONTEND_DIR="artifacts/vps-panel"
cd "$INSTALL_DIR/$FRONTEND_DIR"
npm install --silent
VITE_API_URL="" npm run build
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
cat > /etc/systemd/system/vpspanel.service << EOF
[Unit]
Description=VPS Management Panel
After=network.target lxcfs.service
Wants=lxcfs.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/server/index.js
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
ok "Service started"

# ── SECTION 13: HEALTH CHECK ─────────────────────────────────
log "Waiting for panel to become healthy..."
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    ok "Panel is healthy"
    break
  fi
  [ "$i" -lt 5 ] && { log "Attempt $i/5 — retrying in 5s..."; sleep 5; } || \
    { fail "Panel failed to start. Check: journalctl -u vpspanel -n 50"; }
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
echo "  Logs:     journalctl -u vpspanel -f"
echo "  Status:   systemctl status vpspanel"
echo "  Uninstall: systemctl disable --now vpspanel && rm -rf $INSTALL_DIR"
echo "════════════════════════════════════════════════"
if [ "$NETWORK_MODE" = "tunnel" ]; then
  echo ""
  echo "  ⚠  No public IPv4 detected."
  echo "  For remote access, run:"
  echo "  cloudflared tunnel --url http://localhost:3000"
  echo ""
fi
