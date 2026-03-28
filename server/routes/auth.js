const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../db/database");
const config = require("../config");
const auth = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");

const router = express.Router();

router.post("/login", rateLimit, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Invalid credentials" });
  }

  const user = db
    .prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?")
    .get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwt_secret,
    { expiresIn: "24h" },
  );

  return res.json({
    success: true,
    data: { token, user: { id: user.id, username: user.username, role: user.role } },
  });
});

router.post("/logout", auth, (req, res) => {
  res.json({ success: true });
});

module.exports = router;
