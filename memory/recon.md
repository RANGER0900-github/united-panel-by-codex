## Framework
Vite + React (Wouter routing). React, Vite, and most UI deps are pinned via pnpm catalog entries in [artifacts/vps-panel/package.json](/home/meet/projects/united-panel-by-codex/artifacts/vps-panel/package.json) (e.g., `react: "catalog:"`, `vite: "catalog:"`).

## Pages and Routes
/ → artifacts/vps-panel/src/pages/dashboard.tsx
/instances → artifacts/vps-panel/src/pages/instances.tsx
/host → artifacts/vps-panel/src/pages/host.tsx
/logs → artifacts/vps-panel/src/pages/logs.tsx
/installer → artifacts/vps-panel/src/pages/installer.tsx
* → artifacts/vps-panel/src/pages/not-found.tsx

## Components
artifacts/vps-panel/src/components/layout.tsx → app shell with sidebar/nav + content slot → DATA: none (static)
artifacts/vps-panel/src/components/page-transition.tsx → route transition wrapper → DATA: none
artifacts/vps-panel/src/components/ui/accordion.tsx → accordion primitive (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/alert-dialog.tsx → alert dialog primitive (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/alert.tsx → alert banner styles → DATA: none
artifacts/vps-panel/src/components/ui/aspect-ratio.tsx → aspect ratio wrapper (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/avatar.tsx → avatar primitive (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/badge.tsx → badge styles → DATA: none
artifacts/vps-panel/src/components/ui/breadcrumb.tsx → breadcrumb UI → DATA: none
artifacts/vps-panel/src/components/ui/button-group.tsx → grouped buttons → DATA: none
artifacts/vps-panel/src/components/ui/button.tsx → button styles + variants → DATA: none
artifacts/vps-panel/src/components/ui/calendar.tsx → calendar picker (react-day-picker) → DATA: none
artifacts/vps-panel/src/components/ui/card.tsx → card container + content → DATA: none
artifacts/vps-panel/src/components/ui/carousel.tsx → carousel wrapper (embla) → DATA: none
artifacts/vps-panel/src/components/ui/chart.tsx → chart container helpers → DATA: none
artifacts/vps-panel/src/components/ui/checkbox.tsx → checkbox primitive (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/collapsible.tsx → collapsible primitive (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/command.tsx → command palette styles → DATA: none
artifacts/vps-panel/src/components/ui/context-menu.tsx → context menu (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/dialog.tsx → dialog primitive (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/drawer.tsx → drawer primitive (Vaul) → DATA: none
artifacts/vps-panel/src/components/ui/dropdown-menu.tsx → dropdown menu (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/empty.tsx → empty-state container → DATA: none
artifacts/vps-panel/src/components/ui/field.tsx → form field wrapper → DATA: none
artifacts/vps-panel/src/components/ui/form.tsx → react-hook-form helpers → DATA: none
artifacts/vps-panel/src/components/ui/hover-card.tsx → hover card (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/input-group.tsx → input group wrapper → DATA: none
artifacts/vps-panel/src/components/ui/input-otp.tsx → OTP input (input-otp) → DATA: none
artifacts/vps-panel/src/components/ui/input.tsx → input styles → DATA: none
artifacts/vps-panel/src/components/ui/item.tsx → list/item helper → DATA: none
artifacts/vps-panel/src/components/ui/kbd.tsx → keyboard key pill → DATA: none
artifacts/vps-panel/src/components/ui/label.tsx → label styles (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/menubar.tsx → menubar (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/navigation-menu.tsx → nav menu (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/pagination.tsx → pagination controls → DATA: none
artifacts/vps-panel/src/components/ui/popover.tsx → popover (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/progress.tsx → progress bar (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/radio-group.tsx → radio group (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/resizable.tsx → resizable panels (react-resizable-panels) → DATA: none
artifacts/vps-panel/src/components/ui/scroll-area.tsx → scroll area (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/select.tsx → select dropdown (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/separator.tsx → separator line (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/sheet.tsx → sheet/slide-over (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/sidebar.tsx → sidebar layout primitives → DATA: none
artifacts/vps-panel/src/components/ui/skeleton.tsx → skeleton placeholders → DATA: none
artifacts/vps-panel/src/components/ui/slider.tsx → slider (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/sonner.tsx → toast container (sonner) → DATA: none
artifacts/vps-panel/src/components/ui/spinner.tsx → spinner indicator → DATA: none
artifacts/vps-panel/src/components/ui/switch.tsx → switch (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/table.tsx → table styles → DATA: none
artifacts/vps-panel/src/components/ui/tabs.tsx → tabs (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/textarea.tsx → textarea styles → DATA: none
artifacts/vps-panel/src/components/ui/toast.tsx → toast primitives → DATA: none
artifacts/vps-panel/src/components/ui/toaster.tsx → toast mount point → DATA: none
artifacts/vps-panel/src/components/ui/toggle-group.tsx → toggle group (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/toggle.tsx → toggle (Radix) → DATA: none
artifacts/vps-panel/src/components/ui/tooltip.tsx → tooltip (Radix) → DATA: none

## API Calls Found in Code
GET /api/healthz → artifacts/vps-panel/src/pages/dashboard.tsx line 15 (useHealthCheck)
GET /api/metrics → artifacts/vps-panel/src/pages/dashboard.tsx line 16 (useGetMetrics)
GET /api/metrics/history?limit=60 → artifacts/vps-panel/src/pages/dashboard.tsx line 17 (useGetMetricsHistory)
GET /api/instances → artifacts/vps-panel/src/pages/dashboard.tsx line 18 and artifacts/vps-panel/src/pages/instances.tsx line 41 (useListInstances)
GET /api/host/capabilities → artifacts/vps-panel/src/pages/instances.tsx line 42 and artifacts/vps-panel/src/pages/host.tsx line 10 (useGetHostCapabilities)
GET /api/host/info → artifacts/vps-panel/src/pages/host.tsx line 11 (useGetHostInfo)
POST /api/instances → artifacts/vps-panel/src/pages/instances.tsx line 431 (useCreateInstance)
POST /api/instances/{id}/start → artifacts/vps-panel/src/pages/instances.tsx line 122 (useStartInstance)
POST /api/instances/{id}/stop → artifacts/vps-panel/src/pages/instances.tsx line 123 (useStopInstance)
POST /api/instances/{id}/restart → artifacts/vps-panel/src/pages/instances.tsx line 124 (useRestartInstance)
DELETE /api/instances/{id} → artifacts/vps-panel/src/pages/instances.tsx line 125 (useDeleteInstance)
GET /api/logs?limit=200&level=... → artifacts/vps-panel/src/pages/logs.tsx line 13 (useGetLogs)
GET /api/installer/script → artifacts/vps-panel/src/pages/installer.tsx line 8 (useGetInstallerScript)

## WebSocket Usage
NONE

## Environment Variables Expected
import.meta.env.BASE_URL (used for router base path and background image URL)
process.env.PORT (required by Vite config for dev/preview)
process.env.BASE_PATH (required by Vite config for base path)
process.env.NODE_ENV and process.env.REPL_ID (Vite config plugin gating)

## State Management
React Query for server state, local React state via useState/useMemo/useCallback.

## UI & Design System
Tailwind CSS with custom tokens in [artifacts/vps-panel/src/index.css](/home/meet/projects/united-panel-by-codex/artifacts/vps-panel/src/index.css). Radix UI primitives, Framer Motion for animation, Recharts for charts, Lucide icons. CSS variables include `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, plus utility classes like `glass-card`, `neon-border`, `text-glow-*`.

## Real vs Placeholder Assessment
REAL: routing structure, layout, component hierarchy, styling and animations.
PLACEHOLDER: backend API implementation (all data comes from expected API), auth/login flow (no login route or token handling), WebSockets/real-time updates (none used).

## Inferred API Contract
Base path: `/api` (from OpenAPI server URL).

GET /api/healthz
Response: { status: string, uptime?: number, timestamp?: string }

GET /api/host/capabilities
Response: { systemd, kvm, docker, publicIpv4, virtualization, mountPoints: string[], detectedAt: string, hostMode, startupMode, accessMode }

GET /api/host/info
Response: { hostname, os, kernel, arch, cpuCount, totalMemoryMb, totalDiskGb, publicIp?, uptime }

GET /api/metrics
Response: { cpuPercent, memoryPercent, memoryUsedMb, memoryTotalMb, diskPercent, diskUsedGb, diskTotalGb, networkRxBps, networkTxBps, timestamp }

GET /api/metrics/history?limit=60
Response: { dataPoints: [{ cpuPercent, memoryPercent, networkRxBps, networkTxBps, timestamp }] }

GET /api/instances
Response: { instances: [{ id, name, status, cpuCores, memoryMb, diskGb, ipAddress?, os, createdAt, startedAt?, sshPort?, type, tags? }], total }

POST /api/instances
Request: { name, cpuCores, memoryMb, diskGb, os, type, tags? }
Response: { id, name, status, cpuCores, memoryMb, diskGb, ipAddress?, os, createdAt, startedAt?, sshPort?, type, tags? }

GET /api/instances/{id}
Response: Instance object (same as above)

DELETE /api/instances/{id}
Response: { success: boolean, message: string }

POST /api/instances/{id}/start
Response: Instance object (same as above)

POST /api/instances/{id}/stop
Response: Instance object (same as above)

POST /api/instances/{id}/restart
Response: Instance object (same as above)

GET /api/instances/{id}/metrics
Response: SystemMetrics object

GET /api/logs?limit=100&level=debug|info|warn|error&instanceId=...
Response: { logs: [{ id, timestamp, level, message, instanceId?, source }], total }

GET /api/installer/script
Response: { script: string, version: string, checksum?: string }

## Gaps
MISSING: backend implementation for the `/api/*` surface described above.
MISSING: authentication/login flow and token handling in the frontend.
MISSING: instance detail page and per-instance logs view (only list view exists).
MISSING: WebSocket or SSE for real-time updates (current UI relies on polling).
