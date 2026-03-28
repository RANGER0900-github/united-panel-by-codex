[PASS] T01 — /api/health returned success=true
[PASS] T02 — login returned JWT
[PASS] T03 — login failure returned success=false
[PASS] T04 — /api/vps without token returned success=false
[PASS] T05 — /api/vps with token returned success=true
[PASS] T06 — /api/drivers returned >= 1 driver
[PASS] T07 — /api/images includes ubuntu-24.04
[PASS] T08 — /api/storage returned >= 1 mount
[PASS] T09 — /api/host returned cpu_percent
[PASS] T10 — create VPS returned UUID
[PASS] T11 — VPS status became RUNNING
[PASS] T12 — VPS stop returned success and status STOPPED
[PASS] T13 — VPS start returned success and status RUNNING
[PASS] T14 — VPS delete succeeded and resource removed
[PASS] T15 — Validation errors returned on bad input
[PASS] T16 — Rate limit returned 429 after repeated attempts
