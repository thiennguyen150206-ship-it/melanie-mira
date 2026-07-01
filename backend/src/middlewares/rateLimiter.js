const rateLimit = require("express-rate-limit");

// Giới hạn chung cho tất cả API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // mỗi IP tối đa 100 request trong 15 phút
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
