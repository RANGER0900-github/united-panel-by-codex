import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { vpsInstances } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  ListInstancesResponse,
  GetInstanceResponse,
  CreateInstanceBody,
  DeleteInstanceResponse,
  StartInstanceResponse,
  StopInstanceResponse,
  RestartInstanceResponse,
  GetInstanceMetricsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapInstance(row: typeof vpsInstances.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    status: row.status as "running" | "stopped" | "starting" | "stopping" | "error",
    cpuCores: row.cpuCores,
    memoryMb: row.memoryMb,
    diskGb: Number(row.diskGb),
    ipAddress: row.ipAddress ?? undefined,
    os: row.os,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? undefined,
    sshPort: row.sshPort ?? undefined,
    type: row.type as "kvm" | "docker" | "lxc",
    tags: row.tags ?? [],
  };
}

router.get("/", async (_req, res) => {
  const rows = await db.select().from(vpsInstances).orderBy(vpsInstances.createdAt);
  const mapped = rows.map(row => ({
    ...mapInstance(row),
    sshUsername: row.sshUsername,
    hostname: row.hostname ?? undefined,
    timezone: row.timezone,
    autoStart: row.autoStart,
    hasPublicIpv4: row.hasPublicIpv4,
    cfTunnelEnabled: row.cfTunnelEnabled,
    cfTunnelUrl: row.cfTunnelUrl ?? undefined,
  }));
  res.json({ instances: mapped, total: mapped.length });
});

router.post("/", async (req, res) => {
  const parsed = CreateInstanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const body = parsed.data;
  const sshPort = 20000 + Math.floor(Math.random() * 10000);
  const ipOctet = Math.floor(Math.random() * 200) + 10;

  const hasPublicIpv4 = (req.body.hasPublicIpv4 !== false);
  const hostname = req.body.hostname || body.name;
  const timezone = req.body.timezone || "UTC";
  const autoStart = req.body.autoStart === true;
  const sshUsername = req.body.sshUsername || "root";

  const [row] = await db.insert(vpsInstances).values({
    name: body.name,
    status: "stopped",
    cpuCores: body.cpuCores,
    memoryMb: body.memoryMb,
    diskGb: String(body.diskGb),
    ipAddress: hasPublicIpv4 ? `10.0.0.${ipOctet}` : null,
    os: body.os,
    type: body.type,
    sshPort,
    sshUsername,
    hostname,
    timezone,
    autoStart,
    hasPublicIpv4,
    cfTunnelEnabled: false,
    tags: body.tags ?? [],
  }).returning();

  const data = GetInstanceResponse.parse(mapInstance(row));
  res.status(201).json(data);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(vpsInstances).where(eq(vpsInstances.id, req.params["id"]!));
  if (!row) {
    res.status(404).json({ error: "not_found", message: "Instance not found" });
    return;
  }
  res.json(GetInstanceResponse.parse(mapInstance(row)));
});

router.delete("/:id", async (req, res) => {
  const [row] = await db.select().from(vpsInstances).where(eq(vpsInstances.id, req.params["id"]!));
  if (!row) {
    res.status(404).json({ error: "not_found", message: "Instance not found" });
    return;
  }
  await db.delete(vpsInstances).where(eq(vpsInstances.id, req.params["id"]!));
  res.json(DeleteInstanceResponse.parse({ success: true, message: "Instance deleted" }));
});

router.post("/:id/start", async (req, res) => {
  const [row] = await db.select().from(vpsInstances).where(eq(vpsInstances.id, req.params["id"]!));
  if (!row) { res.status(404).json({ error: "not_found", message: "Instance not found" }); return; }
  if (row.status === "running") { res.status(409).json({ error: "already_running", message: "Instance is already running" }); return; }
  const [updated] = await db.update(vpsInstances).set({ status: "running", startedAt: new Date() }).where(eq(vpsInstances.id, req.params["id"]!)).returning();
  res.json(StartInstanceResponse.parse(mapInstance(updated)));
});

router.post("/:id/stop", async (req, res) => {
  const [row] = await db.select().from(vpsInstances).where(eq(vpsInstances.id, req.params["id"]!));
  if (!row) { res.status(404).json({ error: "not_found", message: "Instance not found" }); return; }
  const [updated] = await db.update(vpsInstances).set({ status: "stopped", startedAt: null }).where(eq(vpsInstances.id, req.params["id"]!)).returning();
  res.json(StopInstanceResponse.parse(mapInstance(updated)));
});

router.post("/:id/restart", async (req, res) => {
  const [row] = await db.select().from(vpsInstances).where(eq(vpsInstances.id, req.params["id"]!));
  if (!row) { res.status(404).json({ error: "not_found", message: "Instance not found" }); return; }
  const [updated] = await db.update(vpsInstances).set({ status: "running", startedAt: new Date() }).where(eq(vpsInstances.id, req.params["id"]!)).returning();
  res.json(RestartInstanceResponse.parse(mapInstance(updated)));
});

router.post("/:id/cf-tunnel", async (req, res) => {
  const [row] = await db.select().from(vpsInstances).where(eq(vpsInstances.id, req.params["id"]!));
  if (!row) { res.status(404).json({ error: "not_found", message: "Instance not found" }); return; }
  const tunnelUrl = `https://${row.name.toLowerCase()}-${row.id.slice(0, 6)}.trycloudflare.com`;
  const [updated] = await db.update(vpsInstances).set({ cfTunnelEnabled: true, cfTunnelUrl: tunnelUrl }).where(eq(vpsInstances.id, req.params["id"]!)).returning();
  res.json({ success: true, tunnelUrl, instance: mapInstance(updated) });
});

router.get("/:id/metrics", async (req, res) => {
  const [row] = await db.select().from(vpsInstances).where(eq(vpsInstances.id, req.params["id"]!));
  if (!row) { res.status(404).json({ error: "not_found", message: "Instance not found" }); return; }
  const isRunning = row.status === "running";
  const data = GetInstanceMetricsResponse.parse({
    cpuPercent: isRunning ? Math.round(Math.random() * 60 + 5) : 0,
    memoryPercent: isRunning ? Math.round(Math.random() * 70 + 10) : 0,
    memoryUsedMb: isRunning ? Math.round(Math.random() * 0.7 * row.memoryMb) : 0,
    memoryTotalMb: row.memoryMb,
    diskPercent: Math.round(Math.random() * 40 + 20),
    diskUsedGb: Math.round(Math.random() * 0.6 * Number(row.diskGb) * 10) / 10,
    diskTotalGb: Number(row.diskGb),
    networkRxBps: isRunning ? Math.round(Math.random() * 500000) : 0,
    networkTxBps: isRunning ? Math.round(Math.random() * 200000) : 0,
    timestamp: new Date().toISOString(),
  });
  res.json(data);
});

export default router;
