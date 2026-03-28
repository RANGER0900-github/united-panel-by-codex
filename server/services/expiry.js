const { v4: uuidv4 } = require("uuid");
const storageManager = require("./storageManager");
const networkManager = require("./networkManager");

function startExpiryChecker(db, driverRegistry) {
  setInterval(() => {
    try {
      const rows = db
        .prepare(
          "SELECT * FROM vps_instances WHERE expires_at IS NOT NULL AND expires_at < unixepoch() AND status != 'DELETED'",
        )
        .all();

      for (const row of rows) {
        try {
          db.prepare(
            "UPDATE vps_instances SET status = 'DELETING', updated_at = unixepoch() WHERE id = ?",
          ).run(row.id);

          const driver = driverRegistry.getDriver(row.technology);
          driver.delete(row.id);
          storageManager.destroyStorage(row.id, row.disk_path);
          networkManager.teardownVPS(row.id);

          db.prepare(
            "UPDATE vps_instances SET status = 'DELETED', updated_at = unixepoch() WHERE id = ?",
          ).run(row.id);

          db.prepare(
            "INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, unixepoch())",
          ).run(
            uuidv4(),
            "system",
            "AUTO_DELETE",
            "vps",
            row.id,
            JSON.stringify({ reason: "expired" }),
          );
        } catch (err) {
          console.error(`expiry delete failed for ${row.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error("expiry checker failed:", err.message);
    }
  }, 60000);
}

module.exports = { startExpiryChecker };
