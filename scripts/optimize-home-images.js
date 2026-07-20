const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");

const rootDirectory = path.resolve(__dirname, "..");
const bannerDirectory = path.join(rootDirectory, "assets", "img", "banners");

const imageJobs = [
  /* Hero desktop: tạo bản 1280px và 1920px */
  {
    input: "banners-desktop.jpg",
    outputs: [
      ["banners-desktop-1280.webp", 1280, 78],
      ["banners-desktop-1920.webp", 1920, 78],
    ],
  },
  {
    input: "banners2-desktop.jpg",
    outputs: [
      ["banners2-desktop-1280.webp", 1280, 78],
      ["banners2-desktop-1920.webp", 1920, 78],
    ],
  },
  {
    input: "banners3-desktop.jpg",
    outputs: [
      ["banners3-desktop-1280.webp", 1280, 78],
      ["banners3-desktop-1920.webp", 1920, 78],
    ],
  },

  /* Hero mobile: bản nhẹ 720px và bản nét 1080px */
  {
    input: "banners-mobile.jpg",
    outputs: [
      ["banners-mobile-720.webp", 720, 78],
      ["banners-mobile-1080.webp", 1080, 78],
    ],
  },
  {
    input: "banners2-mobile.jpg",
    outputs: [
      ["banners2-mobile-720.webp", 720, 78],
      ["banners2-mobile-1080.webp", 1080, 78],
    ],
  },
  {
    input: "banners3-mobile.jpg",
    outputs: [
      ["banners3-mobile-720.webp", 720, 78],
      ["banners3-mobile-1080.webp", 1080, 78],
    ],
  },

  /* Banner ngang */
  {
    input: "banner-ngang.jpg",
    outputs: [
      ["banner-ngang-960.webp", 960, 78],
      ["banner-ngang-1920.webp", 1920, 78],
    ],
  },
  {
    input: "banner-ngang-2.jpg",
    outputs: [
      ["banner-ngang-2-960.webp", 960, 78],
      ["banner-ngang-2-1920.webp", 1920, 78],
    ],
  },

  /* Banner dọc */
  {
    input: "banner-doc.jpg",
    outputs: [
      ["banner-doc-720.webp", 720, 78],
      ["banner-doc-1080.webp", 1080, 78],
    ],
  },

  /* Banner giới thiệu và footer */
  {
    input: "banner-about.jpg",
    outputs: [["banner-about.webp", 1080, 78]],
  },
  {
    input: "banner-about2.jpg",
    outputs: [["banner-about2.webp", 1080, 78]],
  },
  {
    input: "banner-about3.jpg",
    outputs: [["banner-about3.webp", 1080, 78]],
  },
  {
    input: "banner-footer.jpg",
    outputs: [["banner-footer.webp", 600, 78]],
  },
];

async function optimizeImage(inputName, outputConfig) {
  const [outputName, width, quality] = outputConfig;

  const inputPath = path.join(bannerDirectory, inputName);
  const outputPath = path.join(bannerDirectory, outputName);

  await sharp(inputPath)
    .rotate()
    .resize({
      width,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({
      quality,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(outputPath);

  const outputStats = await fs.stat(outputPath);

  console.log(
    `${outputName}: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`,
  );
}

async function run() {
  console.log("Bắt đầu tối ưu ảnh trang chủ...\n");

  for (const job of imageJobs) {
    for (const output of job.outputs) {
      await optimizeImage(job.input, output);
    }
  }

  console.log("\nĐã tạo xong toàn bộ ảnh WebP.");
}

run().catch(function (error) {
  console.error("Không thể tối ưu ảnh:", error);
  process.exitCode = 1;
});
