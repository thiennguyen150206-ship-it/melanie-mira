const express = require("express");
const router = express.Router();

const userAuth = require("../middlewares/userAuth");
const myOrderController = require("../controllers/myOrder.controller");

// Xem hồ sơ tài khoản đang đăng nhập
router.get("/profile", userAuth, myOrderController.getMyProfile);

// Cập nhật hồ sơ tài khoản đang đăng nhập
router.patch("/profile", userAuth, myOrderController.updateMyProfile);

// Xem danh sách địa chỉ của tài khoản đang đăng nhập
router.get("/addresses", userAuth, myOrderController.getMyAddresses);

// Thêm địa chỉ mới
router.post("/addresses", userAuth, myOrderController.createMyAddress);

// Sửa địa chỉ
router.patch("/addresses/:id", userAuth, myOrderController.updateMyAddress);

// Đặt địa chỉ mặc định
router.patch(
  "/addresses/:id/default",
  userAuth,
  myOrderController.setDefaultMyAddress,
);

// Xóa địa chỉ
router.delete("/addresses/:id", userAuth, myOrderController.deleteMyAddress);

// Khách xem đơn của chính mình
router.get("/orders", userAuth, myOrderController.getMyOrders);

// Khách xem chi tiết 1 đơn của chính mình
router.get("/orders/:id", userAuth, myOrderController.getMyOrderById);

// Khách tự hủy đơn hàng của mình
router.patch("/orders/:id/cancel", userAuth, myOrderController.cancelMyOrder);

module.exports = router;
