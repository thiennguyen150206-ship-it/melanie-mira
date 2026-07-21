/* =========================
   API dùng chung - Melanie Mira
   ========================= */

const API_BASE_URL = window.MELANIE_MIRA_CONFIG.API_BASE_URL;

/*
  Cache danh sách sản phẩm trong 5 phút.

  Mục đích:
  - products.js và header.js dùng chung dữ liệu.
  - Không gọi GET /products nhiều lần trên cùng một trang.
  - Khi chuyển giữa các trang, sessionStorage giúp tải nhanh hơn.
*/
const PUBLIC_PRODUCTS_CACHE_KEY = "melaniePublicProductsCacheV1";
const PUBLIC_PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_API_TIMEOUT_MS = 30000;

let publicProductsMemoryCache = null;
let publicProductsRequestPromise = null;

/*
  Tối ưu đường dẫn ảnh sản phẩm.

  - Ảnh nằm trong frontend:
    chuyển JPG/JPEG sang WebP đã tạo sẵn.

  - Ảnh Cloudinary:
    thêm f_auto và q_auto để Cloudinary
    tự chọn định dạng, chất lượng phù hợp.
*/
function optimizePublicProductImageUrl(imageUrl) {
  const image = String(imageUrl || "").trim();

  if (image === "") {
    return "";
  }

  /*
    Chỉ đổi ảnh sản phẩm local.
    Không đổi ảnh bảng size hoặc banner.
  */
  if (/^\/?assets\/img\/products\/.+\.(jpg|jpeg)$/i.test(image)) {
    return image.replace(/\.(jpg|jpeg)$/i, ".webp");
  }

  /*
    Không thêm transformation lần thứ hai
    nếu URL Cloudinary đã được tối ưu trước đó.
  */
  if (
    /^https:\/\/res\.cloudinary\.com\//i.test(image) &&
    image.includes("/image/upload/") &&
    !image.includes("f_auto") &&
    !image.includes("q_auto")
  ) {
    return image.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
  }

  return image;
}

/*
  Chuẩn hóa dữ liệu từ cả hai API:

  GET /products
  GET /products/:slug

  API chi tiết có thể trả images dưới dạng:
  [{ image_url, sort_order }]
*/
function normalizePublicProduct(product) {
  const rawImages = Array.isArray(product.images) ? product.images : [];

  const mainImage = optimizePublicProductImageUrl(product.image);

  const hoverImage = optimizePublicProductImageUrl(product.hover_image);

  const images = rawImages
    .map(function (item) {
      if (typeof item === "string") {
        return optimizePublicProductImageUrl(item);
      }

      if (item && item.image_url) {
        return optimizePublicProductImageUrl(item.image_url);
      }

      return "";
    })
    .filter(function (imageUrl) {
      return imageUrl !== "";
    });

  if (images.length === 0 && mainImage) {
    images.push(mainImage);
  }

  if (hoverImage && !images.includes(hoverImage)) {
    images.push(hoverImage);
  }
  const sizes = Array.isArray(product.sizes)
    ? product.sizes.map(function (sizeItem) {
        return {
          size: sizeItem.size,
          stock: Number(sizeItem.stock || 0),
        };
      })
    : [];

  const oldPriceValue =
    product.old_price !== null &&
    product.old_price !== undefined &&
    product.old_price !== ""
      ? Number(product.old_price)
      : null;

  return {
    id: product.id,
    slug: product.slug,
    productSlug: product.slug,

    nameVi: product.name_vi,
    nameEn: product.name_en,

    categoryVi: product.category_vi,
    categoryEn: product.category_en,
    categorySlug: product.category_slug,

    price: Number(product.price || 0),
    oldPrice: oldPriceValue,

    image: mainImage || images[0] || "",

    hoverImage: hoverImage || images[1] || images[0] || "",
    images: images,

    badge: product.badge,

    descriptionVi: product.description_vi,
    descriptionEn: product.description_en,

    sizes: sizes,
    sizeGuideImage: product.size_guide_image || "",
  };
}

async function requestPublicApi(path, options) {
  const controller = new AbortController();

  const timeoutId = setTimeout(function () {
    controller.abort();
  }, PUBLIC_API_TIMEOUT_MS);

  try {
    const requestOptions = Object.assign({}, options || {}, {
      signal: controller.signal,
    });

    const response = await fetch(API_BASE_URL + path, requestOptions);

    let result;

    try {
      result = await response.json();
    } catch (error) {
      throw new Error("Phản hồi từ hệ thống không hợp lệ.");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể tải dữ liệu từ hệ thống.");
    }

    return result.data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Máy chủ phản hồi quá lâu. Vui lòng thử lại.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function readPublicProductsSessionCache() {
  try {
    const cacheText = sessionStorage.getItem(PUBLIC_PRODUCTS_CACHE_KEY);

    if (!cacheText) {
      return null;
    }

    const cacheData = JSON.parse(cacheText);

    if (
      !cacheData ||
      !Array.isArray(cacheData.products) ||
      !Number(cacheData.savedAt)
    ) {
      return null;
    }

    const cacheAge = Date.now() - Number(cacheData.savedAt);

    if (cacheAge > PUBLIC_PRODUCTS_CACHE_TTL_MS) {
      sessionStorage.removeItem(PUBLIC_PRODUCTS_CACHE_KEY);
      return null;
    }

    return cacheData.products;
  } catch (error) {
    return null;
  }
}

function savePublicProductsSessionCache(productList) {
  try {
    sessionStorage.setItem(
      PUBLIC_PRODUCTS_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        products: productList,
      }),
    );
  } catch (error) {
    /*
      Trình duyệt chặn sessionStorage thì website
      vẫn hoạt động bằng memory cache.
    */
  }
}

async function getPublicProducts(options) {
  const settings = options || {};
  const forceRefresh = settings.forceRefresh === true;

  if (!forceRefresh && Array.isArray(publicProductsMemoryCache)) {
    return publicProductsMemoryCache;
  }

  if (!forceRefresh) {
    const sessionProducts = readPublicProductsSessionCache();

    if (sessionProducts) {
      publicProductsMemoryCache = sessionProducts;
      return publicProductsMemoryCache;
    }
  }

  /*
    Nếu products.js và header.js gọi cùng lúc,
    cả hai sẽ chờ chung một Promise.
  */
  if (publicProductsRequestPromise) {
    return publicProductsRequestPromise;
  }

  publicProductsRequestPromise = requestPublicApi("/products", {
    method: "GET",
  })
    .then(function (productList) {
      const normalizedProducts = productList.map(function (product) {
        return normalizePublicProduct(product);
      });

      publicProductsMemoryCache = normalizedProducts;
      savePublicProductsSessionCache(normalizedProducts);

      return normalizedProducts;
    })
    .finally(function () {
      publicProductsRequestPromise = null;
    });

  return publicProductsRequestPromise;
}

async function getPublicProductBySlug(slug) {
  const safeSlug = String(slug || "").trim();

  if (safeSlug === "") {
    throw new Error("Slug sản phẩm không hợp lệ.");
  }

  const product = await requestPublicApi(
    "/products/" + encodeURIComponent(safeSlug),
    {
      method: "GET",
    },
  );

  return normalizePublicProduct(product);
}

function clearPublicProductsCache() {
  publicProductsMemoryCache = null;
  publicProductsRequestPromise = null;

  try {
    sessionStorage.removeItem(PUBLIC_PRODUCTS_CACHE_KEY);
  } catch (error) {
    // Không cần xử lý khi trình duyệt chặn sessionStorage.
  }
}

window.MelanieProductApi = {
  getProducts: getPublicProducts,
  getProductBySlug: getPublicProductBySlug,
  normalizeProduct: normalizePublicProduct,
  clearProductsCache: clearPublicProductsCache,
};
