const express = require("express");
const auth = require("../middleware/auth");
const { getHostMetrics } = require("../services/metrics");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const data = await getHostMetrics();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to read host metrics" });
  }
});

module.exports = router;
