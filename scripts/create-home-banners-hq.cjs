const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const bannerDirectory = path.resolve(process.cwd(), "assets", "img", "banners");

/*
  Ưu tiên chất lượng cho ảnh thời trang.

  Bản cũ đã bị nén quá mạnh.
  Quality 94 dùng để test độ nét trước.
*/
const WEBP_QUALITY = 94;

const bannerGroups = [
  {
    source: "banners-desktop.jpg",
    outputs: [
      {
        file: "banners-desktop-1280.webp",
        width: 1280,
        height: 640,
      },
      {
        file: "banners-desktop-1920.webp",
        width: 1920,
        height: 960,
      },
    ],
  },
  {
    source: "banners-mobile.jpg",
    outputs: [
      {
        file: "banners-mobile-720.webp",
        width: 720,
        height: 1280,
      },
      {
        file: "banners-mobile-1080.webp",
        width: 1080,
        height: 1920,
      },
    ],
  },
  {
    source: "banners2-desktop.jpg",
    outputs: [
      {
        file: "banners2-desktop-1280.webp",
        width: 1280,
        height: 640,
      },
      {
        file: "banners2-desktop-1920.webp",
        width: 1920,
        height: 960,
      },
    ],
  },
  {
    source: "banners2-mobile.jpg",
    outputs: [
      {
        file: "banners2-mobile-720.webp",
        width: 720,
        height: 1280,
      },
      {
        file: "banners2-mobile-1080.webp",
        width: 1080,
        height: 1920,
      },
    ],
  },
  {
    source: "banners3-desktop.jpg",
    outputs: [
      {
        file: "banners3-desktop-1280.webp",
        width: 1280,
        height: 640,
      },
      {
        file: "banners3-desktop-1920.webp",
        width: 1920,
        height: 960,
      },
    ],
  },
  {
    source: "banners3-mobile.jpg",
    outputs: [
      {
        file: "banners3-mobile-720.webp",
        width: 720,
        height: 1280,
      },
      {
        file: "banners3-mobile-1080.webp",
        width: 1080,
        height: 1920,
      },
    ],
  },
  {
    source: "banner-ngang.jpg",
    outputs: [
      {
        file: "banner-ngang-960.webp",
        width: 960,
        height: 480,
      },
      {
        file: "banner-ngang-1920.webp",
        width: 1920,
        height: 960,
      },
    ],
  },
  {
    source: "banner-ngang-2.jpg",
    outputs: [
      {
        file: "banner-ngang-2-960.webp",
        width: 960,
        height: 480,
      },
      {
        file: "banner-ngang-2-1920.webp",
        width: 1920,
        height: 960,
      },
    ],
  },
  {
    source: "banner-doc.jpg",
    outputs: [
      {
        file: "banner-doc-720.webp",
        width: 720,
        height: 1067,
      },
      {
        file: "banner-doc-1080.webp",
        width: 1080,
        height: 1600,
      },
    ],
  },
  {
    source: "banner-footer.jpg",
    outputs: [
      {
        file: "banner-footer.webp",
        width: 600,
        height: 220,
      },
    ],
  },
];

function formatKB(bytes) {
  return Math.round(bytes / 1024);
}

async function createBanner(group, output) {
  const sourcePath = path.join(bannerDirectory, group.source);

  const outputPath = path.join(bannerDirectory, output.file);

  if (!fs.existsSync(sourcePath)) {
    throw new Error("Không tìm thấy ảnh gốc: " + sourcePath);
  }

  await sharp(sourcePath)
    .rotate()
    .resize(output.width, output.height, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: true,
    })
    .webp({
      quality: WEBP_QUALITY,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(outputPath);

  const sourceSize = fs.statSync(sourcePath).size;
  const outputSize = fs.statSync(outputPath).size;

  console.log("");
  console.log(output.file);
  console.log(`  ${output.width}x${output.height}`);
  console.log(`  JPG gốc: ${formatKB(sourceSize)} KB`);
  console.log(`  WebP HQ: ${formatKB(outputSize)} KB`);
}

async function main() {
  console.log("");
  console.log("TAO LAI BANNER TRANG CHU CHAT LUONG CAO");
  console.log("--------------------------------------");
  console.log("WebP quality:", WEBP_QUALITY);

  for (const group of bannerGroups) {
    for (const output of group.outputs) {
      await createBanner(group, output);
    }
  }

  console.log("");
  console.log("Đã tạo lại toàn bộ banner trang chủ.");
}

main().catch(function (error) {
  console.error("Tạo banner thất bại:", error);
  process.exitCode = 1;
});
