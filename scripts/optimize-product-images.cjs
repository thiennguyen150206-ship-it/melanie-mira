const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const productsDirectory = path.resolve(
  process.cwd(),
  "assets",
  "img",
  "products",
);

const WEBP_QUALITY = 82;

function getJpegFiles(directory) {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getJpegFiles(fullPath));
      continue;
    }

    if (/\.(jpg|jpeg)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

async function main() {
  const jpegFiles = getJpegFiles(productsDirectory);

  let totalOriginalBytes = 0;
  let totalWebpBytes = 0;
  let convertedCount = 0;

  console.log("");
  console.log("BAT DAU CHUYEN ANH SAN PHAM SANG WEBP");
  console.log("---------------------------------------------");

  for (const jpegPath of jpegFiles) {
    const parsedPath = path.parse(jpegPath);
    const webpPath = path.join(
      parsedPath.dir,
      parsedPath.name + ".webp",
    );

    const originalSize = fs.statSync(jpegPath).size;

    await sharp(jpegPath)
      .rotate()
      .webp({
        quality: WEBP_QUALITY,
        effort: 6,
        smartSubsample: true,
      })
      .toFile(webpPath);

    const webpSize = fs.statSync(webpPath).size;

    totalOriginalBytes += originalSize;
    totalWebpBytes += webpSize;
    convertedCount++;

    const savedPercent =
      originalSize > 0
        ? Math.round(
            (1 - webpSize / originalSize) * 100,
          )
        : 0;

    console.log(
      `${path
        .relative(process.cwd(), jpegPath)
        .replaceAll("\\", "/")}`,
    );

    console.log(
      `  JPG: ${formatMB(originalSize)} MB` +
        ` -> WebP: ${formatMB(webpSize)} MB` +
        ` | Giam: ${savedPercent}%`,
    );
  }

  const totalSavedPercent =
    totalOriginalBytes > 0
      ? Math.round(
          (1 - totalWebpBytes / totalOriginalBytes) *
            100,
        )
      : 0;

  console.log("");
  console.log("TONG KET");
  console.log("So anh da chuyen:", convertedCount);
  console.log(
    "Tong JPG:",
    formatMB(totalOriginalBytes),
    "MB",
  );
  console.log(
    "Tong WebP:",
    formatMB(totalWebpBytes),
    "MB",
  );
  console.log("Tiet kiem:", totalSavedPercent + "%");
}

main().catch(function (error) {
  console.error("Khong the chuyen anh:", error);
  process.exitCode = 1;
});
