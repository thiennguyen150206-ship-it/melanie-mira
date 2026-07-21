const path = require("path");
const sharp = require("sharp");

const inputPath = path.resolve(
  "assets/img/logo/logo.jpg",
);

const outputPath = path.resolve(
  "assets/img/logo/favicon.png",
);

async function createFavicon() {
  await sharp(inputPath)
    .resize(64, 64, {
      fit: "contain",
      background: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 1,
      },
    })
    .png({
      compressionLevel: 9,
    })
    .toFile(outputPath);

  console.log(
    "Đã tạo favicon:",
    outputPath,
  );
}

createFavicon().catch(function (error) {
  console.error("Tạo favicon thất bại:", error);
  process.exitCode = 1;
});
