const jwt = require("jsonwebtoken");
const pool = require("../config/db");
require("dotenv").config();

async function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Missing authorization token",
    });
  }

  /*
    Header đúng sẽ có dạng:
    Authorization: Bearer token_o_day
  */
  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format",
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin permission required",
      });
    }

    const [admins] = await pool.query(
      `
      SELECT id, email, role, is_active, token_version
      FROM admin_users
      WHERE id = ?
      LIMIT 1
      `,
      [decoded.id],
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Admin account not found",
      });
    }

    const admin = admins[0];

    if (Number(admin.is_active) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin account is disabled",
      });
    }

    if (Number(decoded.token_version) !== Number(admin.token_version)) {
      return res.status(401).json({
        success: false,
        message: "Admin token has been revoked",
      });
    }

    req.admin = {
      id: Number(admin.id),
      email: admin.email,
      role: admin.role || "admin",
      token_version: Number(admin.token_version),
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

module.exports = adminAuth;
