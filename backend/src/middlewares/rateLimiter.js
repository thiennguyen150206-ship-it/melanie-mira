const rateLimit = require("express-rate-limit");

function isPublicProductReadRequest(req) {
  const requestPath = req.originalUrl.split("?")[0];

  if (req.method !== "GET") {
    return false;
  }

  if (requestPath === "/api/products") {
    return true;
  }

  if (
    requestPath.startsWith("/api/products/") &&
    !requestPath.startsWith("/api/products/admin")
  ) {
    return true;
  }

  return false;
}

function isHealthCheckRequest(req) {
  const requestPath = req.originalUrl.split("?")[0];

  return req.method === "GET" && requestPath === "/api/health";
}

// Giới hạn chung cho API quan trọng.
// Bỏ qua API xem sản phẩm public để khách không bị chặn khi lướt shop.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,
  skip: function (req) {
    return isPublicProductReadRequest(req) || isHealthCheckRequest(req);
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Giới hạn riêng cho đăng nhập / đăng ký thường
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many auth requests, please try again later",
  },
});

// Giới hạn riêng cho đăng nhập admin
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many admin login attempts, please try again later",
  },
});

// Giới hạn riêng cho gửi email OTP
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email requests, please try again later",
  },
});

// Giới hạn riêng cho đặt hàng
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many order requests. Please try again later.",
  },
});

module.exports = {
  apiLimiter,
  orderLimiter,
  authLimiter,
  adminLoginLimiter,
  emailLimiter,
};
