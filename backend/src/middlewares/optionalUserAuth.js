// Middleware này cho phép khách chưa đăng nhập vẫn đặt hàng.
// Nếu có customer token hợp lệ thì gắn req.user vào request.
// Nếu không có token, token sai, hoặc token không phải customer thì vẫn cho đi tiếp như khách vãng lai.

const jwt = require("jsonwebtoken");

function optionalUserAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    req.user = null;
    return next();
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "customer") {
      req.user = null;
      return next();
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
}

module.exports = optionalUserAuth;
