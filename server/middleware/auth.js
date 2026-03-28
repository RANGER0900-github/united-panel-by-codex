const jwt = require("jsonwebtoken");
const config = require("../config");

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, config.jwt_secret);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
}

module.exports = auth;
