const express = require("express");
const auth = require("../middleware/auth");
const { listDrivers, getRecommended } = require("../drivers");

const router = express.Router();

router.get("/", auth, (req, res) => {
  res.json({ success: true, data: { drivers: listDrivers() } });
});

router.get("/recommended", auth, (req, res) => {
  const driver = getRecommended();
  res.json({ success: true, data: { driver: driver.name } });
});

module.exports = router;
