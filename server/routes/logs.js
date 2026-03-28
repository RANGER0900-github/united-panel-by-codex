const express = require("express");
const fs = require("fs");
const path = require("path");
const auth = require("../middleware/auth");
const { db } = require("../db/database");

function createLogsRouter(driverRegistry) {
  const router = express.Router();
  router.use(auth);

  router.get("/:id/logs", (req, res) => {
    const vps = db
      .prepare("SELECT * FROM vps_instances WHERE id = ?")
      .get(req.params.id);
    if (!vps) {
      return res.status(404).json({ success: false, error: "Not found" });
    }

    const lines = Math.max(1, Math.min(1000, Number(req.query.lines) || 100));

    try {
      const driver = driverRegistry.getDriver(vps.technology);
      const result = driver.exec(vps.id, `journalctl -n ${lines} --no-pager`);
      const logs = (result.stdout || "").split("\n").filter(Boolean);
      return res.json({ success: true, data: { logs } });
    } catch (err) {
      const fallbackPath = path.resolve(process.cwd(), "logs", `${vps.id}.log`);
      if (fs.existsSync(fallbackPath)) {
        const content = fs.readFileSync(fallbackPath, "utf8");
        const logs = content.split("\n").filter(Boolean).slice(-lines);
        return res.json({ success: true, data: { logs } });
      }
      return res.json({ success: true, data: { logs: [] } });
    }
  });

  return router;
}

module.exports = createLogsRouter;
