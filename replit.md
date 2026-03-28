# Workspace

## Overview

pnpm workspace monorepo using TypeScript. VPS Management Panel — a production-grade dashboard for managing nested VPS instances on top of a rented Linux host.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, framer-motion, recharts, date-fns, tailwind
- **UI library**: Shadcn/ui components

## Features

- **Dashboard** — Live CPU/RAM/Network/Disk metrics, real-time charts, instance summary
- **Instances** — VPS instance list with start/stop/restart/delete, create instance dialog
- **Host System** — Host capability detection (systemd, KVM, Docker, IPv4, virtualization), system info
- **Live Logs** — Color-coded terminal-style log viewer with filtering
- **Installer** — One-line installer.sh generator with copy-to-clipboard

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   │   └── src/routes/     # health, host, metrics, instances, logs, installer
│   └── vps-panel/          # React + Vite frontend (dark cyberpunk theme)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/     # instances.ts (vps_instances table)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## API Routes

- `GET /api/healthz` — Health check
- `GET /api/host/capabilities` — Detect systemd, KVM, Docker, IPv4, virtualization
- `GET /api/host/info` — OS, kernel, arch, CPU count, RAM, disk, public IP, uptime
- `GET /api/metrics` — Live CPU%, RAM%, disk%, network Rx/Tx
- `GET /api/metrics/history?limit=60` — Historical metrics for charts
- `GET /api/instances` — List all VPS instances
- `POST /api/instances` — Create instance
- `GET /api/instances/:id` — Get instance
- `DELETE /api/instances/:id` — Delete instance
- `POST /api/instances/:id/start` — Start instance
- `POST /api/instances/:id/stop` — Stop instance
- `POST /api/instances/:id/restart` — Restart instance
- `GET /api/instances/:id/metrics` — Instance-specific metrics
- `GET /api/logs` — System logs (filterable by level, instanceId)
- `GET /api/installer/script` — Returns installer.sh content

## Database Schema

### `vps_instances`
- `id` — UUID (PK)
- `name`, `status`, `cpu_cores`, `memory_mb`, `disk_gb`, `ip_address`, `os`, `type`, `ssh_port`, `tags`, `created_at`, `started_at`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Always typecheck from the root: `pnpm run typecheck`.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- `pnpm --filter @workspace/api-server run dev` — run the dev server

### `artifacts/vps-panel` (`@workspace/vps-panel`)

React + Vite frontend. Dark cyberpunk theme with:
- framer-motion animations on all pages and elements
- recharts for real-time metrics visualization
- shadcn/ui components
- TanStack React Query for data fetching
- wouter for routing

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `pnpm --filter @workspace/db run push` — push schema to DB

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and Orval config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`
