const express = require("express");
const router = express.Router();

const productController = require("../controllers/product.controller");
const adminAuth = require("../middlewares/adminAuth");

const {
  uploadSingleProductImage,
} = require("../middlewares/productImageUpload");

const { uploadProductImage } = require("../controllers/upload.controller");

// Admin xem tồn kho sản phẩm
router.get("/admin/stock", adminAuth, productController.getAdminProductStock);

// Admin cập nhật tồn kho sản phẩm
router.patch(
  "/admin/stock/:id",
  adminAuth,
  productController.updateAdminProductStock,
);

// Admin lấy danh mục sản phẩm
router.get(
  "/admin/categories",
  adminAuth,
  productController.getAdminCategories,
);

// Admin thêm danh mục sản phẩm
router.post(
  "/admin/categories",
  adminAuth,
  productController.createAdminCategory,
);

// Admin sửa danh mục sản phẩm
router.patch(
  "/admin/categories/:id",
  adminAuth,
  productController.updateAdminCategory,
);

// Admin upload ảnh sản phẩm lên Cloudinary
router.post(
  "/admin/upload-image",
  adminAuth,
  uploadSingleProductImage,
  uploadProductImage,
);

// Admin xem danh sách sản phẩm đầy đủ
router.get("/admin/list", adminAuth, productController.getAdminProducts);

// Admin xem chi tiết sản phẩm theo ID
router.get(
  "/admin/detail/:id",
  adminAuth,
  productController.getAdminProductById,
);

// Admin thêm sản phẩm mới
router.post("/admin", adminAuth, productController.createAdminProduct);

// Admin ẩn / hiện sản phẩm
router.patch(
  "/admin/:id/status",
  adminAuth,
  productController.updateAdminProductStatus,
);

// Admin xóa mềm sản phẩm
router.patch(
  "/admin/:id/delete",
  adminAuth,
  productController.softDeleteAdminProduct,
);

// Admin khôi phục sản phẩm đã xóa mềm
router.patch(
  "/admin/:id/restore",
  adminAuth,
  productController.restoreAdminProduct,
);

// Admin sửa sản phẩm
router.patch("/admin/:id", adminAuth, productController.updateAdminProduct);

// Khách xem danh sách sản phẩm
router.get("/", productController.getAllProducts);

// Khách xem chi tiết sản phẩm theo slug
router.get("/:slug", productController.getProductBySlug);

module.exports = router;
