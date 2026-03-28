const express = require("express");
const auth = require("../middleware/auth");
const { listImages } = require("../services/imageManager");

const router = express.Router();

router.get("/", auth, (req, res) => {
  res.json({ success: true, data: { images: listImages() } });
});

module.exports = router;
