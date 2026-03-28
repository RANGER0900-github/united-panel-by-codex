const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      uptime: process.uptime(),
      version: "1.0.0",
      timestamp: Date.now(),
    },
  });
});

module.exports = router;
