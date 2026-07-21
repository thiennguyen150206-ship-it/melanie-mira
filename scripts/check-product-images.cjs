const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const rootDirectory = path.resolve(
  process.cwd(),
  "assets",
  "img",
  "products",
);

function getImageFiles(directory) {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getImageFiles(fullPath));
      continue;
    }

    if (/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const imageFiles = getImageFiles(rootDirectory);
  const results = [];

  for (const imagePath of imageFiles) {
    const fileInfo = fs.statSync(imagePath);
    const metadata = await sharp(imagePath).metadata();

    results.push({
      path: path
        .relative(process.cwd(), imagePath)
        .replaceAll("\\", "/"),
      sizeMB: fileInfo.size / 1024 / 1024,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || "",
    });
  }

  results.sort(function (a, b) {
    return b.sizeMB - a.sizeMB;
  });

  console.log("");
  console.log("DUNG LUONG | KICH THUOC | DINH DANG | DUONG DAN");
  console.log("------------------------------------------------------------");

  for (const image of results) {
    const sizeText = image.sizeMB.toFixed(2).padStart(6);
    const dimensionText = (
      image.width + "x" + image.height
    ).padStart(11);

    console.log(
      `${sizeText} MB | ${dimensionText} | ` +
        `${image.format.padEnd(7)} | ${image.path}`,
    );
  }

  const widths = results.map(function (image) {
    return image.width;
  });

  const heights = results.map(function (image) {
    return image.height;
  });

  console.log("");
  console.log("TONG KET");
  console.log("Số ảnh:", results.length);
  console.log("Chiều rộng nhỏ nhất:", Math.min(...widths));
  console.log("Chiều rộng lớn nhất:", Math.max(...widths));
  console.log("Chiều cao nhỏ nhất:", Math.min(...heights));
  console.log("Chiều cao lớn nhất:", Math.max(...heights));
}

main().catch(function (error) {
  console.error("Không thể kiểm tra ảnh:", error);
  process.exitCode = 1;
});
