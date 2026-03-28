## Stack Decision
Vite + React frontend → Node.js + Express + socket.io + SQLite (better-sqlite3). This matches the build-order requirements and keeps backend small and deployable.

## Directory Structure
/
├── artifacts/
│   └── vps-panel/               (frontend)
├── server/
│   ├── index.js
│   ├── config.js
│   ├── db/
│   │   ├── schema.sql
│   │   └── database.js
│   ├── routes/
│   │   ├── health.js
│   │   ├── auth.js
│   │   ├── host.js
│   │   ├── vps.js
│   │   ├── images.js
│   │   ├── storage.js
│   │   ├── drivers.js
│   │   └── logs.js
│   ├── drivers/
│   │   ├── index.js
│   │   ├── lxc.js
│   │   ├── gvisor.js
│   │   ├── sysbox.js
│   │   └── qemu_tcg.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validate.js
│   │   ├── rateLimit.js
│   │   └── audit.js
│   └── services/
│       ├── metrics.js
│       ├── imageManager.js
│       ├── storageManager.js
│       ├── networkManager.js
│       └── expiry.js
├── memory/
├── screenshots/
├── tests/
│   └── e2e.spec.js
└── install.sh   (Phase 6)

## Database Schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'admin',
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS vps_instances (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  status TEXT,
  cpu INTEGER,
  ram_mb INTEGER,
  disk_gb INTEGER,
  disk_path TEXT,
  image TEXT,
  technology TEXT,
  ip_address TEXT,
  expires_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  display_name TEXT,
  size_gb REAL,
  rootfs_path TEXT,
  available INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

## VPS State Machine
CREATING → RUNNING (success) | FAILED (error)
RUNNING → STOPPING | REBOOTING | DELETING
STOPPING → STOPPED
STOPPED → RUNNING (start) | DELETING
REBOOTING → RUNNING
DELETING → DELETED
FAILED → DELETING

## Driver Interface
Every driver must export:
isAvailable() → boolean
create(config: { id, name, cpu, ram_mb, disk_gb, disk_path, image }) → void
start(id) → void
stop(id) → void
reboot(id) → void
delete(id) → void
stats(id) → { cpu_percent, ram_used_mb, net_rx_bps, net_tx_bps }
exec(id, command) → { stdout, stderr, exit_code }

Auto-select priority:
1. LXC
2. gVisor (runsc)
3. Sysbox (sysbox-runc)
4. QEMU-TCG (qemu-system-x86_64)

## Complete API Surface
POST /api/auth/login → routes/auth.js → no
POST /api/auth/logout → routes/auth.js → yes
GET  /api/health → routes/health.js → no
GET  /api/host → routes/host.js → yes
GET  /api/drivers → routes/drivers.js → yes
GET  /api/drivers/recommended → routes/drivers.js → yes
GET  /api/images → routes/images.js → yes
GET  /api/storage → routes/storage.js → yes
GET  /api/vps → routes/vps.js → yes
POST /api/vps → routes/vps.js → yes
GET  /api/vps/:id → routes/vps.js → yes
POST /api/vps/:id/start → routes/vps.js → yes
POST /api/vps/:id/stop → routes/vps.js → yes
POST /api/vps/:id/reboot → routes/vps.js → yes
DELETE /api/vps/:id → routes/vps.js → yes
GET  /api/vps/:id/logs → routes/logs.js → yes

Mismatch with frontend recon.md:
Frontend expects `/api/healthz`, `/api/metrics`, `/api/metrics/history`, `/api/instances*`, `/api/logs`, and `/api/installer/script`.
Backend plan above provides `/api/health` and `/api/vps*` plus driver/image/storage endpoints. These will need reconciliation in Phase 3.

## Security Rules
- All subprocess calls use array form, never string interpolation.
- Sanitize all user strings: strip to `/^[a-zA-Z0-9_-]+$/` before use.
- JWT secret loaded from config file, never in source code.
- Rate limit `/api/auth/login`: 10 req/min per IP → 429 response.
- Every POST/DELETE/PATCH writes to audit_logs before returning.
- Config file permissions: 600.
