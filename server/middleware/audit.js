const { v4: uuidv4 } = require("uuid");
const { db } = require("../db/database");

const METHODS = new Set(["POST", "PATCH", "DELETE"]);

function audit(req, res, next) {
  res.on("finish", () => {
    if (!METHODS.has(req.method)) return;

    try {
      const now = Math.floor(Date.now() / 1000);
      const userId = req.user?.id || "unknown";
      const action = `${req.method} ${req.originalUrl}`;
      const resourceType = req.baseUrl || "unknown";
      const resourceId = req.params?.id || null;
      const details = JSON.stringify({ status: res.statusCode });

      db.prepare(
        "INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(uuidv4(), userId, action, resourceType, resourceId, details, now);
    } catch (err) {
      // Avoid blocking responses for audit failures.
      console.error("Audit log failed:", err.message);
    }
  });

  next();
}

module.exports = audit;
