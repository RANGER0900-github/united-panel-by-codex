import { Router, type IRouter } from "express";
import { GetInstallerScriptResponse } from "@workspace/api-zod";
import { createHash } from "crypto";

const router: IRouter = Router();

const SCRIPT_VERSION = "1.0.0";

const INSTALLER_SCRIPT = `#!/bin/bash
# VPS Management Panel - One-Line Installer
# Version: ${SCRIPT_VERSION}
# Usage: curl -sSL https://your-domain.com/api/installer/script | bash

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
CYAN='\\033[0;36m'
BOLD='\\033[1m'
NC='\\033[0m'

log_info()  { echo -e "\${GREEN}[INFO]\${NC} \${1}"; }
log_warn()  { echo -e "\${YELLOW}[WARN]\${NC} \${1}"; }
log_error() { echo -e "\${RED}[ERROR]\${NC} \${1}"; }
log_step()  { echo -e "\${CYAN}[\${BOLD}STEP\${NC}\${CYAN}]\${NC} \${1}"; }

INSTALL_DIR="/opt/vps-panel"
SERVICE_NAME="vps-panel"
PORT="\${VPS_PANEL_PORT:-3000}"

detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "\$ID"
  elif command -v uname &>/dev/null; then
    uname -s | tr '[:upper:]' '[:lower:]'
  else
    echo "unknown"
  fi
}

detect_package_manager() {
  if command -v apt-get &>/dev/null; then echo "apt"
  elif command -v yum &>/dev/null; then echo "yum"
  elif command -v dnf &>/dev/null; then echo "dnf"
  elif command -v pacman &>/dev/null; then echo "pacman"
  elif command -v apk &>/dev/null; then echo "apk"
  else echo "unknown"; fi
}

detect_systemd() {
  systemctl --version &>/dev/null && echo "true" || echo "false"
}

detect_kvm() {
  [ -e /dev/kvm ] && echo "true" || echo "false"
}

detect_docker() {
  (command -v docker &>/dev/null || [ -S /var/run/docker.sock ]) && echo "true" || echo "false"
}

check_root() {
  if [ "\$(id -u)" -ne 0 ]; then
    log_error "This installer must be run as root. Use: sudo bash"
    exit 1
  fi
}

install_node() {
  log_step "Installing Node.js 20..."
  local pkg_mgr=\$(detect_package_manager)
  case "\$pkg_mgr" in
    apt)
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      apt-get install -y nodejs
      ;;
    yum|dnf)
      curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
      \$pkg_mgr install -y nodejs
      ;;
    apk)
      apk add --no-cache nodejs npm
      ;;
    *)
      log_error "Unsupported package manager: \$pkg_mgr"
      exit 1
      ;;
  esac
}

setup_service_systemd() {
  log_step "Setting up systemd service..."
  cat > /etc/systemd/system/\${SERVICE_NAME}.service << EOF
[Unit]
Description=VPS Management Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=\${INSTALL_DIR}
ExecStart=/usr/bin/node \${INSTALL_DIR}/dist/index.mjs
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=\${PORT}

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable \${SERVICE_NAME}
  systemctl start \${SERVICE_NAME}
  log_info "Service started via systemd"
}

setup_service_init() {
  log_warn "systemd not detected, using rc.local fallback"
  mkdir -p \${INSTALL_DIR}/bin
  cat > \${INSTALL_DIR}/bin/start.sh << EOF
#!/bin/bash
cd \${INSTALL_DIR}
NODE_ENV=production PORT=\${PORT} node dist/index.mjs &
echo \$! > \${INSTALL_DIR}/vps-panel.pid
EOF
  chmod +x \${INSTALL_DIR}/bin/start.sh

  if [ -f /etc/rc.local ]; then
    echo "\${INSTALL_DIR}/bin/start.sh" >> /etc/rc.local
  fi
  \${INSTALL_DIR}/bin/start.sh
  log_info "Service started via rc.local"
}

main() {
  echo ""
  echo -e "\${CYAN}\${BOLD}============================================\${NC}"
  echo -e "\${CYAN}\${BOLD}   VPS Management Panel Installer v${SCRIPT_VERSION}   \${NC}"
  echo -e "\${CYAN}\${BOLD}============================================\${NC}"
  echo ""

  check_root

  local os_id=\$(detect_os)
  local has_systemd=\$(detect_systemd)
  local has_kvm=\$(detect_kvm)
  local has_docker=\$(detect_docker)

  log_info "Detected OS: \$os_id"
  log_info "systemd: \$has_systemd | KVM: \$has_kvm | Docker: \$has_docker"
  echo ""

  if ! command -v node &>/dev/null; then
    install_node
  else
    log_info "Node.js already installed: \$(node --version)"
  fi

  log_step "Creating install directory: \${INSTALL_DIR}"
  mkdir -p \${INSTALL_DIR}

  log_step "Downloading VPS Panel..."
  # Replace with actual download URL
  log_warn "Download step: configure DOWNLOAD_URL in production"

  log_step "Installing dependencies..."
  cd \${INSTALL_DIR}
  npm install --production 2>/dev/null || true

  if [ "\$has_systemd" = "true" ]; then
    setup_service_systemd
  else
    setup_service_init
  fi

  echo ""
  echo -e "\${GREEN}\${BOLD}Installation complete!\${NC}"
  echo -e "Dashboard URL: http://\$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print \$1}'):\${PORT}"
  echo ""
}

main "\$@"
`;

const checksum = createHash("sha256").update(INSTALLER_SCRIPT).digest("hex");

router.get("/script", (_req, res) => {
  const data = GetInstallerScriptResponse.parse({
    script: INSTALLER_SCRIPT,
    version: SCRIPT_VERSION,
    checksum,
  });
  res.json(data);
});

export default router;
