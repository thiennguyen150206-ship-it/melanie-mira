const { cloudinary, hasCloudinaryConfig } = require("../config/cloudinary");

async function uploadProductImage(req, res) {
  try {
    if (!hasCloudinaryConfig()) {
      return res.status(500).json({
        success: false,
        message: "Cloudinary is not configured.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ảnh cần upload.",
      });
    }

    const folder = process.env.CLOUDINARY_FOLDER || "melanie-mira/products";

    const base64Image = req.file.buffer.toString("base64");
    const dataUri = "data:" + req.file.mimetype + ";base64," + base64Image;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: folder,
      resource_type: "image",
      unique_filename: true,
      overwrite: false,
    });

    return res.json({
      success: true,
      message: "Upload ảnh thành công.",
      data: {
        image_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error("Upload product image error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể upload ảnh sản phẩm.",
    });
  }
}

module.exports = {
  uploadProductImage,
};
