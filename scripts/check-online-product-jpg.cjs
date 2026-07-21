const API_BASE_URL =
  "https://melanie-mira-backend.onrender.com/api";

function isLocalProductJpeg(value) {
  return /^\/?assets\/img\/products\/.+\.(jpg|jpeg)$/i.test(
    String(value || "").trim(),
  );
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        `Request failed with status ${response.status}`,
    );
  }

  return result.data;
}

async function main() {
  const productList = await fetchJson(
    API_BASE_URL + "/products",
  );

  const references = [];

  for (const product of productList) {
    const slug = String(product.slug || "").trim();

    if (isLocalProductJpeg(product.image)) {
      references.push({
        slug,
        source: "list",
        field: "image",
        value: product.image,
      });
    }

    if (isLocalProductJpeg(product.hover_image)) {
      references.push({
        slug,
        source: "list",
        field: "hover_image",
        value: product.hover_image,
      });
    }

    if (!slug) {
      continue;
    }

    try {
      const detail = await fetchJson(
        API_BASE_URL +
          "/products/" +
          encodeURIComponent(slug),
      );

      if (isLocalProductJpeg(detail.image)) {
        references.push({
          slug,
          source: "detail",
          field: "image",
          value: detail.image,
        });
      }

      if (isLocalProductJpeg(detail.hover_image)) {
        references.push({
          slug,
          source: "detail",
          field: "hover_image",
          value: detail.hover_image,
        });
      }

      const galleryImages = Array.isArray(detail.images)
        ? detail.images
        : [];

      for (let i = 0; i < galleryImages.length; i++) {
        const item = galleryImages[i];

        const imageUrl =
          typeof item === "string"
            ? item
            : item?.image_url;

        if (isLocalProductJpeg(imageUrl)) {
          references.push({
            slug,
            source: "detail",
            field: `images[${i}]`,
            value: imageUrl,
          });
        }
      }
    } catch (error) {
      console.error(
        `Không kiểm tra được sản phẩm ${slug}:`,
        error.message,
      );
    }
  }

  console.log("");
  console.log("THAM CHIEU JPG LOCAL TRONG API ONLINE");
  console.log("------------------------------------");

  if (references.length === 0) {
    console.log("Không còn đường dẫn JPG local.");
  } else {
    console.table(references);
  }

  console.log("");
  console.log("Tổng tham chiếu:", references.length);
}

main().catch(function (error) {
  console.error("Kiểm tra thất bại:", error);
  process.exitCode = 1;
});
