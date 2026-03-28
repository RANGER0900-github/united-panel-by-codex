const express = require("express");
const auth = require("../middleware/auth");
const { listMounts } = require("../services/storageManager");

const router = express.Router();

router.get("/", auth, (req, res) => {
  res.json({ success: true, data: { mounts: listMounts() } });
});

module.exports = router;
