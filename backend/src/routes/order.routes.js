const express = require("express");
const router = express.Router();

const adminAuth = require("../middlewares/adminAuth");
const { orderLimiter } = require("../middlewares/rateLimiter");
const orderController = require("../controllers/order.controller");
const optionalUserAuth = require("../middlewares/optionalUserAuth");

// Xem danh sách đơn hàng
router.get("/", adminAuth, orderController.getAllOrders);

// Xem thống kê đơn hàng
router.get("/stats", adminAuth, orderController.getOrderStats);

// Cập nhật trạng thái đơn hàng
router.patch("/:id/status", adminAuth, orderController.updateOrderStatus);

// Xem chi tiết 1 đơn hàng
router.get("/:id", adminAuth, orderController.getOrderById);

// Tạo đơn hàng mới
router.post("/", orderLimiter, optionalUserAuth, orderController.createOrder);

module.exports = router;
