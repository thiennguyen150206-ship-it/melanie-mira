const express = require("express");
const router = express.Router();

const adminAuth = require("../middlewares/adminAuth");
const userAuth = require("../middlewares/userAuth");
const optionalUserAuth = require("../middlewares/optionalUserAuth");
const couponController = require("../controllers/coupon.controller");

// Khách xem mã công khai của shop
router.get("/public", optionalUserAuth, couponController.getPublicCoupons);

// Khách kiểm tra mã giảm giá
// Bắt buộc đăng nhập để tránh khách vãng lai dùng mã.
router.post("/validate", userAuth, couponController.validateCoupon);

// Admin xem danh sách mã giảm giá
router.get("/admin", adminAuth, couponController.getAdminCoupons);

// Admin tạo mã giảm giá
router.post("/admin", adminAuth, couponController.createAdminCoupon);

// Admin cập nhật mã giảm giá
router.patch("/admin/:id", adminAuth, couponController.updateAdminCoupon);

// Admin bật / tắt mã giảm giá
router.patch(
  "/admin/:id/status",
  adminAuth,
  couponController.updateAdminCouponStatus,
);

module.exports = router;
