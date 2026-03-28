const express = require("express");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const auth = require("../middleware/auth");
const audit = require("../middleware/audit");
const { validateVPSInput } = require("../middleware/validate");
const { db } = require("../db/database");
const { getHostMetrics } = require("../services/metrics");
const { ensureImage } = require("../services/imageManager");
const storageManager = require("../services/storageManager");
const networkManager = require("../services/networkManager");

function createVpsRouter(io, driverRegistry) {
  const router = express.Router();
  router.use(auth);

  router.get("/", (req, res) => {
    const vps = db
      .prepare("SELECT * FROM vps_instances WHERE status != 'DELETED'")
      .all();
    res.json({ success: true, data: vps });
  });

  router.post("/", audit, async (req, res) => {
    const validation = validateVPSInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.errors });
    }

    const { name, cpu, ram_mb, disk_gb, image, technology, storage_path, expires_at } =
      req.body;

    const metrics = await getHostMetrics();
    const availableRam = metrics.ram_total_mb - metrics.ram_used_mb;
    if (ram_mb > availableRam - 512) {
      return res.status(400).json({ success: false, error: "Insufficient RAM" });
    }

    if (!storageManager.validatePath(storage_path, disk_gb)) {
      return res.status(400).json({ success: false, error: "Invalid storage path" });
    }

    const id = uuidv4();
    const diskPath = storageManager.provisionStorage(id, storage_path);
    const imagePath = ensureImage(image);
    const now = Math.floor(Date.now() / 1000);

    const record = {
      id,
      name,
      status: "CREATING",
      cpu,
      ram_mb,
      disk_gb,
      disk_path: diskPath,
      image,
      technology,
      ip_address: null,
      expires_at: expires_at ? Math.floor(new Date(expires_at).getTime() / 1000) : null,
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `INSERT INTO vps_instances
      (id, name, status, cpu, ram_mb, disk_gb, disk_path, image, technology, ip_address, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.name,
      record.status,
      record.cpu,
      record.ram_mb,
      record.disk_gb,
      record.disk_path,
      record.image,
      record.technology,
      record.ip_address,
      record.expires_at,
      record.created_at,
      record.updated_at,
    );

    io.emit("vps:update", { id: record.id, status: "CREATING" });

    setImmediate(async () => {
      try {
        const driver = driverRegistry.getDriver(technology);
        await driver.create({
          id,
          name,
          cpu,
          ram_mb,
          disk_gb,
          disk_path: diskPath,
          image: imagePath,
        });
        const net = networkManager.setupVPS(id, record) || {};
        db.prepare(
          "UPDATE vps_instances SET status = 'RUNNING', ip_address = ?, updated_at = unixepoch() WHERE id = ?",
        ).run(net.ip || null, id);
        io.emit("vps:update", { id, status: "RUNNING", ip_address: net.ip || null });
      } catch (err) {
        try {
          const driver = driverRegistry.getDriver(technology);
          driver.delete(id);
        } catch {}
        try {
          const basePath = path.dirname(path.dirname(diskPath));
          storageManager.destroyStorage(id, basePath);
        } catch {}
        try {
          networkManager.teardownVPS(id);
        } catch {}
        db.prepare(
          "UPDATE vps_instances SET status = 'FAILED', updated_at = unixepoch() WHERE id = ?",
        ).run(id);
        io.emit("vps:update", { id, status: "FAILED" });
      }
    });

    return res.json({ success: true, data: record });
  });

  router.get("/:id", (req, res) => {
    const vps = db
      .prepare("SELECT * FROM vps_instances WHERE id = ? AND status != 'DELETED'")
      .get(req.params.id);
    if (!vps) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    return res.json({ success: true, data: vps });
  });

  router.post("/:id/start", audit, (req, res) => {
    const vps = db
      .prepare("SELECT * FROM vps_instances WHERE id = ?")
      .get(req.params.id);
    if (!vps) return res.status(404).json({ success: false, error: "Not found" });
    if (!["STOPPED", "FAILED"].includes(vps.status)) {
      return res.status(409).json({ success: false, error: "Invalid state" });
    }
    const driver = driverRegistry.getDriver(vps.technology);
    driver.start(vps.id);
    db.prepare(
      "UPDATE vps_instances SET status = 'RUNNING', updated_at = unixepoch() WHERE id = ?",
    ).run(vps.id);
    io.emit("vps:update", { id: vps.id, status: "RUNNING" });
    return res.json({ success: true });
  });

  router.post("/:id/stop", audit, (req, res) => {
    const vps = db
      .prepare("SELECT * FROM vps_instances WHERE id = ?")
      .get(req.params.id);
    if (!vps) return res.status(404).json({ success: false, error: "Not found" });
    if (vps.status !== "RUNNING") {
      return res.status(409).json({ success: false, error: "Invalid state" });
    }
    db.prepare(
      "UPDATE vps_instances SET status = 'STOPPING', updated_at = unixepoch() WHERE id = ?",
    ).run(vps.id);
    io.emit("vps:update", { id: vps.id, status: "STOPPING" });

    const driver = driverRegistry.getDriver(vps.technology);
    driver.stop(vps.id);

    db.prepare(
      "UPDATE vps_instances SET status = 'STOPPED', updated_at = unixepoch() WHERE id = ?",
    ).run(vps.id);
    io.emit("vps:update", { id: vps.id, status: "STOPPED" });
    return res.json({ success: true });
  });

  router.post("/:id/reboot", audit, (req, res) => {
    const vps = db
      .prepare("SELECT * FROM vps_instances WHERE id = ?")
      .get(req.params.id);
    if (!vps) return res.status(404).json({ success: false, error: "Not found" });
    if (vps.status !== "RUNNING") {
      return res.status(409).json({ success: false, error: "Invalid state" });
    }
    db.prepare(
      "UPDATE vps_instances SET status = 'REBOOTING', updated_at = unixepoch() WHERE id = ?",
    ).run(vps.id);
    io.emit("vps:update", { id: vps.id, status: "REBOOTING" });

    const driver = driverRegistry.getDriver(vps.technology);
    driver.reboot(vps.id);

    db.prepare(
      "UPDATE vps_instances SET status = 'RUNNING', updated_at = unixepoch() WHERE id = ?",
    ).run(vps.id);
    io.emit("vps:update", { id: vps.id, status: "RUNNING" });
    return res.json({ success: true });
  });

  router.delete("/:id", audit, (req, res) => {
    const vps = db
      .prepare("SELECT * FROM vps_instances WHERE id = ?")
      .get(req.params.id);
    if (!vps) return res.status(404).json({ success: false, error: "Not found" });
    db.prepare(
      "UPDATE vps_instances SET status = 'DELETING', updated_at = unixepoch() WHERE id = ?",
    ).run(vps.id);
    io.emit("vps:update", { id: vps.id, status: "DELETING" });

    const driver = driverRegistry.getDriver(vps.technology);
    driver.delete(vps.id);
    const basePath = path.dirname(path.dirname(vps.disk_path));
    storageManager.destroyStorage(vps.id, basePath);
    networkManager.teardownVPS(vps.id);
    db.prepare(
      "UPDATE vps_instances SET status = 'DELETED', updated_at = unixepoch() WHERE id = ?",
    ).run(vps.id);
    io.emit("vps:update", { id: vps.id, status: "DELETED" });
    return res.json({ success: true });
  });

  return router;
}

module.exports = createVpsRouter;
