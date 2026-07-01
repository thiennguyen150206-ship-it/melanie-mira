const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");

const {
  authLimiter,
  adminLoginLimiter,
  emailLimiter,
} = require("../middlewares/rateLimiter");

// Khách đăng ký
router.post("/register", authLimiter, authController.registerCustomer);

// Khách đăng nhập
router.post("/login", authLimiter, authController.loginCustomer);

// Admin đăng nhập
router.post("/admin/login", adminLoginLimiter, authController.adminLogin);

// Đăng nhập bằng Google
router.get("/google", authLimiter, authController.loginWithGoogle);

// Google gọi lại backend sau khi đăng nhập
router.get("/google/callback", authController.googleCallback);

// Bắt đầu đăng nhập/đăng ký bằng email OTP
router.post("/email/start", emailLimiter, authController.startEmailLogin);

// Xác minh mã OTP email
router.post("/email/verify", authLimiter, authController.verifyEmailCode);

module.exports = router;
