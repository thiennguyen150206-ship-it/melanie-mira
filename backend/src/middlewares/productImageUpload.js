const multer = require("multer");

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
  fileFilter: function (req, file, callback) {
    if (!allowedImageTypes.includes(file.mimetype)) {
      return callback(new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP."));
    }

    callback(null, true);
  },
});

function uploadSingleProductImage(req, res, next) {
  upload.single("image")(req, res, function (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Ảnh không được vượt quá 4MB.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Không thể đọc file ảnh.",
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "File ảnh không hợp lệ.",
      });
    }

    next();
  });
}

module.exports = {
  uploadSingleProductImage,
};
