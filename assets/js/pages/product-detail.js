/* =========================
   SEO trang chi tiết sản phẩm
   ========================= */

const PRODUCT_DETAIL_BASE_URL =
  "https://melaniemira.com.vn/product-detail.html";

const PRODUCTS_PAGE_URL = "https://melaniemira.com.vn/products.html";

let currentProduct = null;
let selectedSize = "";
let buyNowItem = null;
let productSource = [];

function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

function escapeProductDetailHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hasDiscountPrice(product) {
  let price = Number(product.price);
  let oldPrice = Number(product.oldPrice);

  return oldPrice > 0 && oldPrice > price;
}

function createDetailPriceHtml(product) {
  if (hasDiscountPrice(product)) {
    return `
      <div class="detail-price-box has-old-price">
        <span class="detail-price-old">${formatMoney(product.oldPrice)}</span>
        <span class="detail-price-current">${formatMoney(product.price)}</span>
      </div>
    `;
  }

  return `
    <div class="detail-price-box">
      <span class="detail-price-current">${formatMoney(product.price)}</span>
    </div>
  `;
}

function isLocalDevHost() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:"
  );
}

function getProductSlugFromUrl() {
  let params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

function getProductIdFromUrl() {
  let params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function findProductBySlugOrId(productList, slug, productId) {
  if (!Array.isArray(productList)) {
    return null;
  }

  if (slug) {
    return productList.find(function (product) {
      return product.slug === slug || product.productSlug === slug;
    });
  }

  if (productId) {
    return productList.find(function (product) {
      return Number(product.id) === Number(productId);
    });
  }

  return null;
}

function getAbsoluteProductImageUrl(imageUrl) {
  const fallbackImage =
    "https://melaniemira.com.vn/assets/img/banners/banners-desktop.jpg";

  const value = String(imageUrl || "").trim();

  if (value === "") {
    return fallbackImage;
  }

  try {
    return new URL(value, "https://melaniemira.com.vn/").href;
  } catch (error) {
    return fallbackImage;
  }
}

function cleanProductSeoText(description) {
  return String(description || "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(Chi tiết sản phẩm|Product Details?)\s*/i, "")
    .trim();
}

function createProductSeoDescription(product) {
  let description = cleanProductSeoText(
    product.descriptionVi || product.description,
  );

  if (description === "") {
    description =
      (product.nameVi || "Sản phẩm thời trang nữ") +
      " với thiết kế thanh lịch, nữ tính từ Melanie Mira.";
  }

  /*
    Giữ mô tả SEO khoảng 150 - 160 ký tự.
    Không cắt ngang giữa một từ.
  */
  if (description.length > 160) {
    description = description.slice(0, 157);

    const lastSpaceIndex = description.lastIndexOf(" ");

    if (lastSpaceIndex > 100) {
      description = description.slice(0, lastSpaceIndex);
    }

    description += "...";
  }

  return description;
}

function getProductCanonicalUrl(product) {
  if (product.slug) {
    return (
      PRODUCT_DETAIL_BASE_URL + "?slug=" + encodeURIComponent(product.slug)
    );
  }

  if (product.id) {
    return PRODUCT_DETAIL_BASE_URL + "?id=" + encodeURIComponent(product.id);
  }

  return PRODUCTS_PAGE_URL;
}

function productHasAvailableStock(product) {
  const sizes = product.sizes || [];

  /*
    API cũ không trả sizes thì không tự đánh dấu hết hàng.
  */
  if (sizes.length === 0) {
    return true;
  }

  return sizes.some(function (sizeItem) {
    return Number(sizeItem.stock) > 0;
  });
}

function normalizeProductDetailBrowserUrl(product) {
  if (!product || !product.slug) {
    return;
  }

  const normalizedUrl =
    "product-detail.html?slug=" + encodeURIComponent(product.slug);

  const currentFileName =
    window.location.pathname.split("/").pop() || "product-detail.html";

  const currentUrl = currentFileName + window.location.search;

  if (currentUrl !== normalizedUrl) {
    window.history.replaceState(null, "", normalizedUrl);
  }
}

function updateProductStructuredData(product, canonicalUrl, description) {
  const imageList = createProductImages(product)
    .filter(function (imageUrl) {
      return Boolean(imageUrl);
    })
    .map(function (imageUrl) {
      return getAbsoluteProductImageUrl(imageUrl);
    });

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameVi || product.nameEn || "Sản phẩm Melanie Mira",
    description: description,
    image: imageList,
    sku: String(product.id),
    url: canonicalUrl,
    category: product.categoryVi || "",
    brand: {
      "@type": "Brand",
      name: "Melanie Mira",
    },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "VND",
      price: String(Math.round(Number(product.price || 0))),
      availability: productHasAvailableStock(product)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  const scriptElement = document.getElementById("productStructuredData");

  if (scriptElement) {
    scriptElement.textContent = JSON.stringify(structuredData);
  }
}

function setProductCanonicalUrl(canonicalUrl) {
  let canonicalElement = document.getElementById("seoCanonical");

  if (!canonicalElement) {
    canonicalElement = document.createElement("link");
    canonicalElement.id = "seoCanonical";
    canonicalElement.rel = "canonical";

    document.head.appendChild(canonicalElement);
  }

  canonicalElement.href = canonicalUrl;
}

function updateProductDetailSeo(product) {
  /*
    SEO chính của website là tiếng Việt.
    Metadata không phụ thuộc vào localStorage ngôn ngữ.
  */
  const productName =
    product.nameVi || product.nameEn || "Sản phẩm Melanie Mira";

  const title = productName + " | Melanie Mira";
  const description = createProductSeoDescription(product);
  const canonicalUrl = getProductCanonicalUrl(product);
  const imageUrl = getAbsoluteProductImageUrl(product.image);

  document.title = title;

  $("#seoDescription").attr("content", description);
  $("#seoRobots").attr("content", "index, follow");
  setProductCanonicalUrl(canonicalUrl);

  $("#seoOgTitle").attr("content", title);
  $("#seoOgDescription").attr("content", description);
  $("#seoOgUrl").attr("content", canonicalUrl);
  $("#seoOgImage").attr("content", imageUrl);

  $("#seoTwitterTitle").attr("content", title);
  $("#seoTwitterDescription").attr("content", description);
  $("#seoTwitterImage").attr("content", imageUrl);

  updateProductStructuredData(product, canonicalUrl, description);
}

function updateProductNotFoundSeo() {
  const title = "Không tìm thấy sản phẩm | Melanie Mira";

  const description =
    "Sản phẩm này có thể đã bị xóa, bị ẩn hoặc chưa được cập nhật trên Melanie Mira.";

  const fallbackImage =
    "https://melaniemira.com.vn/assets/img/banners/banners-desktop.jpg";

  document.title = title;

  $("#seoDescription").attr("content", description);
  $("#seoRobots").attr("content", "noindex, follow");
  setProductCanonicalUrl(PRODUCTS_PAGE_URL);

  $("#seoOgTitle").attr("content", title);
  $("#seoOgDescription").attr("content", description);
  $("#seoOgUrl").attr("content", PRODUCTS_PAGE_URL);
  $("#seoOgImage").attr("content", fallbackImage);

  $("#seoTwitterTitle").attr("content", title);
  $("#seoTwitterDescription").attr("content", description);
  $("#seoTwitterImage").attr("content", fallbackImage);

  const scriptElement = document.getElementById("productStructuredData");

  if (scriptElement) {
    scriptElement.textContent = "{}";
  }
}
async function loadProductDetail() {
  const slug = getProductSlugFromUrl();
  const productId = getProductIdFromUrl();

  currentProduct = null;
  productSource = [];

  /*
    Trường hợp URL đã có slug:
    lấy thẳng chi tiết sản phẩm, không tải danh sách trước.
  */
  if (slug) {
    try {
      currentProduct = await window.MelanieProductApi.getProductBySlug(slug);

      return;
    } catch (error) {
      console.log("Cannot load product directly by slug:", error);
    }

    /*
      API chi tiết lỗi thì thử tìm sản phẩm
      trong danh sách API/cache trước khi fallback local.
    */
    try {
      productSource = await window.MelanieProductApi.getProducts();

      currentProduct = findProductBySlugOrId(productSource, slug, null);

      if (currentProduct) {
        return;
      }
    } catch (error) {
      console.log("Cannot find product from public products:", error);
    }
  }

  /*
    URL cũ dùng ?id=...
    Cần lấy danh sách để tìm slug tương ứng.
  */
  if (!slug && productId) {
    try {
      productSource = await window.MelanieProductApi.getProducts();

      const productFromList = findProductBySlugOrId(
        productSource,
        null,
        productId,
      );

      if (productFromList && productFromList.slug) {
        try {
          currentProduct = await window.MelanieProductApi.getProductBySlug(
            productFromList.slug,
          );
        } catch (error) {
          /*
            API chi tiết lỗi thì vẫn dùng dữ liệu
            cơ bản từ danh sách sản phẩm.
          */
          currentProduct = productFromList;
        }
      } else {
        currentProduct = productFromList;
      }

      if (currentProduct) {
        return;
      }
    } catch (error) {
      console.log("Cannot load product detail by id:", error);
    }
  }

  /*
    Chỉ dùng products-data.js khi chạy local.
    Website online không hiện ảnh/dữ liệu cũ.
  */
  if (isLocalDevHost() && typeof products !== "undefined") {
    productSource = products;

    currentProduct = findProductBySlugOrId(products, slug, productId);
  }
}

async function loadRecommendProductsLater() {
  if (!currentProduct) {
    return;
  }

  try {
    /*
      Danh sách sản phẩm chỉ dùng cho phần gợi ý.
      Sản phẩm chính đã được render trước đó.
    */
    productSource = await window.MelanieProductApi.getProducts();

    renderRecommendProducts(currentProduct);
  } catch (error) {
    console.log("Cannot load recommended products:", error);

    /*
      Local có thể dùng dữ liệu mẫu để test.
    */
    if (isLocalDevHost() && typeof products !== "undefined") {
      productSource = products;
      renderRecommendProducts(currentProduct);
      return;
    }

    $("#recommendProducts").empty();
  }
}

function scheduleRecommendProductsLoad() {
  if (!currentProduct) {
    return;
  }

  /*
    Chờ trình duyệt render sản phẩm chính trước,
    sau đó mới tải danh sách gợi ý.
  */
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(
      function () {
        loadRecommendProductsLater();
      },
      {
        timeout: 1500,
      },
    );

    return;
  }

  setTimeout(function () {
    loadRecommendProductsLater();
  }, 200);
}

function createProductImages(product) {
  if (product.images && product.images.length > 0) {
    return product.images;
  }

  return [product.image];
}

function getProductSizeStock(product, size) {
  if (!product || !product.sizes || product.sizes.length === 0) {
    return null;
  }

  for (let i = 0; i < product.sizes.length; i++) {
    if (product.sizes[i].size === size) {
      return Number(product.sizes[i].stock);
    }
  }

  return null;
}

function getCartQuantityByProductAndSize(productId, size) {
  let cart = getCart();

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === productId && cart[i].size === size) {
      return Number(cart[i].quantity);
    }
  }

  return 0;
}

/* =========================
   Meta Pixel - Product events
   ========================= */

function createMetaProductEventParameters(product, quantity) {
  if (!product) {
    return null;
  }

  const productId = String(product.id || "").trim();
  const itemQuantity = Math.max(1, Number(quantity) || 1);

  const itemPrice = Math.max(0, Number(product.price) || 0);

  if (productId === "") {
    return null;
  }

  return {
    content_ids: [productId],
    content_name: getProductName(product),
    content_category: getProductCategory(product),
    content_type: "product",

    contents: [
      {
        id: productId,
        quantity: itemQuantity,
        item_price: itemPrice,
      },
    ],

    value: itemPrice * itemQuantity,
    currency: "VND",
  };
}

function trackCurrentProductView() {
  if (
    !currentProduct ||
    !window.MelanieMetaPixel ||
    typeof window.MelanieMetaPixel.trackStandardOnce !== "function"
  ) {
    return;
  }

  const parameters = createMetaProductEventParameters(currentProduct, 1);

  if (!parameters) {
    return;
  }

  /*
    Chống gửi lại khi renderProductDetail()
    được gọi sau khi tạo đơn.
    Tải lại trang vẫn được tính là lượt xem mới.
  */
  const dedupeKey = "product:" + String(currentProduct.id);

  window.MelanieMetaPixel.trackStandardOnce(
    "ViewContent",
    dedupeKey,
    parameters,
    "memory",
  );
}

function trackCurrentProductAddToCart() {
  if (
    !currentProduct ||
    !window.MelanieMetaPixel ||
    typeof window.MelanieMetaPixel.trackStandard !== "function"
  ) {
    return;
  }

  const parameters = createMetaProductEventParameters(currentProduct, 1);

  if (!parameters) {
    return;
  }

  /*
    Size là thông tin sản phẩm, không phải dữ liệu cá nhân.
  */
  parameters.size = String(selectedSize || "");

  window.MelanieMetaPixel.trackStandard("AddToCart", parameters);
}

/* =========================
   Product cart helpers
   ========================= */

function createCurrentCartItem() {
  return {
    id: currentProduct.id,
    price: currentProduct.price,
    image: currentProduct.image,
    size: selectedSize,
    quantity: 1,
    stock: getProductSizeStock(currentProduct, selectedSize),
  };
}

/*
  Hiệu ứng quăng ảnh sản phẩm vào icon giỏ hàng.
  Dùng cho nút "Thêm vào giỏ".
*/
function animateProductToCart() {
  let productImage = $("#productDetailGallery img").first();
  let cartIcon = $(".cart-link").first();

  if (productImage.length === 0 || cartIcon.length === 0) {
    return;
  }

  let imageRect = productImage[0].getBoundingClientRect();
  let cartRect = cartIcon[0].getBoundingClientRect();

  let flyingImage = $("<img />");

  flyingImage.attr("src", productImage.attr("src"));
  flyingImage.addClass("fly-cart-img");

  flyingImage.css({
    left: imageRect.left + imageRect.width / 2 - 40 + "px",
    top: imageRect.top + imageRect.height / 2 - 50 + "px",
  });

  $("body").append(flyingImage);

  let moveX =
    cartRect.left + cartRect.width / 2 - (imageRect.left + imageRect.width / 2);

  let moveY =
    cartRect.top + cartRect.height / 2 - (imageRect.top + imageRect.height / 2);

  setTimeout(function () {
    flyingImage.css({
      transform: "translate(" + moveX + "px, " + moveY + "px) scale(0.15)",
      opacity: "0.15",
    });
  }, 20);

  setTimeout(function () {
    flyingImage.remove();

    cartIcon.addClass("cart-bump");

    setTimeout(function () {
      cartIcon.removeClass("cart-bump");
    }, 350);
  }, 760);
}

function renderProductImages(product) {
  const images = createProductImages(product);

  const productName = escapeProductDetailHtml(getProductName(product));

  let html = "";

  for (let i = 0; i < images.length; i++) {
    const imageUrl = escapeProductDetailHtml(images[i]);

    /*
      Ảnh đầu tiên hiển thị ngay khi mở trang.
      Những ảnh còn lại chỉ tải khi người dùng cuộn gần tới.
    */
    const loadingMode = i === 0 ? "eager" : "lazy";
    const fetchPriority = i === 0 ? "high" : "low";

    html += `
      <div class="product-detail-image-item">
        <img
          src="${imageUrl}"
          alt="${productName}"
          loading="${loadingMode}"
          fetchpriority="${fetchPriority}"
          decoding="async"
        />
      </div>
    `;
  }

  $("#productDetailGallery").html(html);
}

/* =========================
   Product size guide modal
   ========================= */

function getProductSizeGuideImage(product) {
  if (!product) {
    return "";
  }

  if (product.sizeGuideImage) {
    return product.sizeGuideImage;
  }

  /*
    Nếu sản phẩm lấy từ API nhưng API chưa có size_guide_image,
    thì lấy ảnh bảng size dự phòng từ products-data.js.
  */
  if (typeof products !== "undefined") {
    let localProduct = products.find(function (item) {
      return (
        Number(item.id) === Number(product.id) ||
        item.slug === product.slug ||
        item.productSlug === product.slug
      );
    });

    if (localProduct && localProduct.sizeGuideImage) {
      return localProduct.sizeGuideImage;
    }
  }

  return "";
}

function renderProductSizeGuide(product) {
  let sizeGuideImage = getProductSizeGuideImage(product);

  if (sizeGuideImage === "") {
    $("#btnOpenSizeGuide").hide();
    $("#sizeGuideImage").attr("src", "");
    return;
  }

  $("#btnOpenSizeGuide").show();
  $("#sizeGuideImage").attr("src", sizeGuideImage);
  $("#sizeGuideImage").attr("alt", getProductName(product) + " Size Guide");
}

function openSizeGuideModal() {
  if (!currentProduct) {
    return;
  }

  let sizeGuideImage = getProductSizeGuideImage(currentProduct);

  if (sizeGuideImage === "") {
    return;
  }

  $("#sizeGuideImage").attr("src", sizeGuideImage);
  $("#sizeGuideImage").attr(
    "alt",
    getProductName(currentProduct) + " Size Guide",
  );

  $("#sizeGuideModal").addClass("active");
  $("#sizeGuideModal").attr("aria-hidden", "false");
}

function closeSizeGuideModal() {
  $("#sizeGuideModal").removeClass("active");
  $("#sizeGuideModal").attr("aria-hidden", "true");
}

function initSizeGuideModal() {
  $(document).on("click", "#btnOpenSizeGuide", function () {
    openSizeGuideModal();
  });

  $(document).on("click", "#btnCloseSizeGuide", function () {
    closeSizeGuideModal();
  });

  /*
    Bấm/click vùng ngoài ảnh thì đóng modal.
    Mobile cũng chạy vì thao tác chạm sẽ phát sinh click.
  */
  $(document).on("click", "#sizeGuideModal", function (e) {
    if (e.target === this) {
      closeSizeGuideModal();
    }
  });

  /*
    Desktop: bấm Esc cũng đóng được.
  */
  $(document).on("keydown", function (e) {
    if (e.key === "Escape") {
      closeSizeGuideModal();
    }
  });
}

function renderProductSizes(product) {
  let sizes = product.sizes || [];
  let html = "";

  /*
    Nếu API chưa trả sizes thì dùng tạm S/M/L như cũ.
    Trường hợp này giúp web không bị hỏng khi backend lỗi.
  */
  if (sizes.length === 0) {
    sizes = [
      { size: "S", stock: 1 },
      { size: "M", stock: 1 },
      { size: "L", stock: 1 },
    ];
  }

  for (let i = 0; i < sizes.length; i++) {
    let sizeItem = sizes[i];
    let disabledClass = "";
    let disabledAttr = "";

    if (Number(sizeItem.stock) <= 0) {
      disabledClass = " disabled";
      disabledAttr = "disabled";
    }

    html += `
      <button
        type="button"
        class="size-option${disabledClass}"
        data-size="${sizeItem.size}"
        ${disabledAttr}
      >
        ${sizeItem.size}
      </button>
    `;
  }

  $(".size-options").html(html);

  let hasStock = sizes.some(function (sizeItem) {
    return Number(sizeItem.stock) > 0;
  });

  if (!hasStock) {
    $("#sizeMessage").text("Sản phẩm hiện đã hết hàng.");
    $("#btnAddToCartDetail").prop("disabled", true);
    $("#btnBuyNow").prop("disabled", true);
  } else {
    /*
    Sản phẩm còn hàng và khách chưa thao tác:
    không hiện thông báo hay skeleton.
  */
    $("#sizeMessage").empty();

    $("#btnAddToCartDetail").prop("disabled", false);
    $("#btnBuyNow").prop("disabled", false);
  }
}

function isDescriptionDetailTitle(line) {
  const text = String(line || "")
    .trim()
    .toLowerCase();

  return (
    text === "chi tiết sản phẩm" ||
    text === "product detail" ||
    text === "product details"
  );
}

function isDescriptionMaterialTitle(line) {
  const text = String(line || "")
    .trim()
    .toLowerCase();

  return (
    text === "chất liệu" ||
    text === "material" ||
    text === "materials" ||
    text === "fabric"
  );
}

function cleanDescriptionLine(line) {
  return String(line || "")
    .trim()
    .replace(/^[-•*]\s*/, "");
}

function getMaterialTitleText() {
  if ($("body").hasClass("lang-en")) {
    return "Material";
  }

  return "Chất liệu";
}

function parseProductDescriptionSections(description) {
  const lines = String(description || "")
    .split("\n")
    .map(function (line) {
      return cleanDescriptionLine(line);
    })
    .filter(function (line) {
      return line !== "";
    });

  const detailLines = [];
  const materialLines = [];

  let currentSection = "detail";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isDescriptionDetailTitle(line)) {
      currentSection = "detail";
      continue;
    }

    if (isDescriptionMaterialTitle(line)) {
      currentSection = "material";
      continue;
    }

    if (currentSection === "material") {
      materialLines.push(line);
    } else {
      detailLines.push(line);
    }
  }

  return {
    detailText: detailLines.join(" "),
    materialLines: materialLines,
  };
}

function createProductDetailDescriptionHtml(product, description, category) {
  const sections = parseProductDescriptionSections(description);

  let html = `
    <ul class="detail-main-list">
  `;

  if (sections.detailText) {
    html += `
      <li class="detail-description-text">
       ${escapeProductDetailHtml(sections.detailText)}
      </li>
    `;
  }

  html += `
      <li>
     ${escapeProductDetailHtml(t("product.category"))}: ${escapeProductDetailHtml(category)}
      </li>
    </ul>
  `;

  if (sections.materialLines.length > 0) {
    html += `
      <h3 class="detail-material-title">
     ${escapeProductDetailHtml(getMaterialTitleText())}
      </h3>

      <ul class="detail-material-list">
    `;

    for (let i = 0; i < sections.materialLines.length; i++) {
      html += `
        <li>${escapeProductDetailHtml(sections.materialLines[i])}</li>
      `;
    }

    html += `
      </ul>
    `;
  }

  return html;
}

function renderProductInfo(product) {
  let name = getProductName(product);
  let description = getProductDescription(product);
  let category = getProductCategory(product);

  $("#detailName").text(name);
  $("#detailPrice").html(createDetailPriceHtml(product));

  $("#detailInfoList").html(
    createProductDetailDescriptionHtml(product, description, category),
  );

  renderProductSizes(product);
  renderProductSizeGuide(product);
}

function getProductDetailLink(product) {
  if (product.slug) {
    return "product-detail.html?slug=" + encodeURIComponent(product.slug);
  }

  if (product.id) {
    return "product-detail.html?id=" + encodeURIComponent(product.id);
  }

  return "products.html";
}
function renderRecommendProducts(product) {
  let maxRecommend = 4;

  /* Ưu tiên lấy sản phẩm cùng nhóm */
  let sameCategoryProducts = productSource.filter(function (item) {
    return item.id !== product.id && item.categorySlug === product.categorySlug;
  });

  let suggestProducts = [];

  /* Nếu cùng nhóm có sản phẩm thì lấy trước */
  for (let i = 0; i < sameCategoryProducts.length; i++) {
    if (suggestProducts.length < maxRecommend) {
      suggestProducts.push(sameCategoryProducts[i]);
    }
  }

  /* Nếu chưa đủ thì lấy thêm sản phẩm nhóm khác */
  if (suggestProducts.length < maxRecommend) {
    let otherProducts = productSource.filter(function (item) {
      return (
        item.id !== product.id && item.categorySlug !== product.categorySlug
      );
    });

    for (let i = 0; i < otherProducts.length; i++) {
      if (suggestProducts.length < maxRecommend) {
        suggestProducts.push(otherProducts[i]);
      }
    }
  }

  let html = "";

  for (let i = 0; i < suggestProducts.length; i++) {
    html += `
   <a href="${getProductDetailLink(suggestProducts[i])}" class="recommend-item">
     <img
  src="${escapeProductDetailHtml(suggestProducts[i].image)}"
  alt="${escapeProductDetailHtml(getProductName(suggestProducts[i]))}"
  loading="lazy"
  fetchpriority="low"
  decoding="async"
/>
<h4>${getProductName(suggestProducts[i])}</h4>
        <p>${formatMoney(suggestProducts[i].price)}</p>
      </a>
    `;
  }

  $("#recommendProducts").attr("aria-busy", "false").html(html);
}

function renderProductDetailSkeleton() {
  /*
    Khung ảnh chính.
  */
  $("#productDetailGallery").attr("aria-busy", "true").html(`
      <div
        class="product-detail-image-item product-detail-skeleton-image"
        aria-hidden="true"
      >
        <div class="skeleton-block skeleton-detail-image"></div>
      </div>
    `);

  /*
    Khung tên và giá.
  */
  $("#detailName").html(`
    <span class="skeleton-block skeleton-detail-title"></span>
    <span class="skeleton-block skeleton-detail-title short"></span>
  `);

  $("#detailPrice").html(`
    <div class="skeleton-block skeleton-detail-price"></div>
  `);

  /*
    Khung nội dung chi tiết.
  */
  $("#detailInfoList").html(`
    <div aria-hidden="true">
      <div class="skeleton-block skeleton-detail-text"></div>
      <div class="skeleton-block skeleton-detail-text"></div>
      <div class="skeleton-block skeleton-detail-text short"></div>
    </div>
  `);

  /*
    Khung lựa chọn size.
  */
  $(".size-options").html(`
    <span class="skeleton-block skeleton-detail-size"></span>
    <span class="skeleton-block skeleton-detail-size"></span>
    <span class="skeleton-block skeleton-detail-size"></span>
  `);

  /*
  Không hiện skeleton ở khu vực thông báo size.
  Khu vực này chỉ xuất hiện sau khi khách thao tác.
*/
  $("#sizeMessage").empty();

  $("#btnOpenSizeGuide").hide();

  $("#btnAddToCartDetail, #btnBuyNow").prop("disabled", true);

  $(".product-detail-info").attr("aria-busy", "true");
}

function renderRecommendProductsSkeleton() {
  let html = "";

  for (let i = 0; i < 4; i++) {
    html += `
      <div
        class="recommend-item recommend-skeleton-item"
        aria-hidden="true"
      >
        <div class="skeleton-block recommend-skeleton-image"></div>
        <div class="skeleton-block recommend-skeleton-name"></div>
        <div class="skeleton-block recommend-skeleton-price"></div>
      </div>
    `;
  }

  $("#recommendProducts").attr("aria-busy", "true").html(html);
}

function renderProductDetail() {
  if (!currentProduct) {
    updateProductNotFoundSeo();

    $(".product-detail-page").html(`
      <div class="container py-5 text-center">
        <h2>${t("product.notFound")}</h2>
        <p>${t("product.notFoundDesc")}</p>
        <a href="products.html" class="btn-main">${t("product.backToProducts")}</a>
      </div>
    `);

    return;
  }

  $("#productDetailGallery").attr("aria-busy", "false");
  $(".product-detail-info").attr("aria-busy", "false");

  /*
    Chuẩn hóa URL ?id=... thành ?slug=...
    mà không tải lại trang.
  */
  normalizeProductDetailBrowserUrl(currentProduct);

  updateProductDetailSeo(currentProduct);

  trackCurrentProductView();

  renderProductImages(currentProduct);
  renderProductInfo(currentProduct);

  /*
  Phần gợi ý được tải riêng sau khi
  sản phẩm chính đã hiển thị.
*/
  renderRecommendProductsSkeleton();
}

function addProductToCart() {
  if (!currentProduct) {
    return;
  }

  if (selectedSize === "") {
    $("#sizeMessage").text(t("product.sizeNeed"));
    return;
  }

  let selectedStock = getProductSizeStock(currentProduct, selectedSize);
  let currentCartQuantity = getCartQuantityByProductAndSize(
    currentProduct.id,
    selectedSize,
  );

  if (selectedStock !== null && selectedStock <= 0) {
    $("#sizeMessage").text("Size này hiện đã hết hàng.");
    return;
  }

  if (selectedStock !== null && currentCartQuantity >= selectedStock) {
    $("#sizeMessage").text(
      "Bạn đã thêm tối đa số lượng còn lại của size " + selectedSize + ".",
    );
    return;
  }

  let cart = getCart();

  let index = cart.findIndex(function (item) {
    return item.id === currentProduct.id && item.size === selectedSize;
  });

  if (index !== -1) {
    cart[index].quantity += 1;
  } else {
    cart.push(createCurrentCartItem());
  }

  saveCart(cart);

  /*
  Chỉ gửi AddToCart sau khi sản phẩm
  thực sự được lưu thành công vào giỏ.
*/
  trackCurrentProductAddToCart();

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }

  $("#sizeMessage").text(
    t("product.addedSize") +
      " " +
      selectedSize +
      " " +
      t("product.addedToCart"),
  );

  /*
    Không mở modal nữa.
    Chỉ chạy hiệu ứng bay vào icon giỏ hàng.
  */
  animateProductToCart();
}

/* =========================
   Buy now checkout modal
   Mua ngay chỉ thanh toán sản phẩm hiện tại,
   không thêm vào giỏ hàng chính
   ========================= */

function openBuyNowCheckoutModal() {
  if (!currentProduct) {
    return;
  }

  if (selectedSize === "") {
    $("#sizeMessage").text(t("product.sizeNeed"));
    return;
  }

  let selectedStock = getProductSizeStock(currentProduct, selectedSize);

  if (selectedStock !== null && selectedStock <= 0) {
    $("#sizeMessage").text("Size này hiện đã hết hàng.");
    return;
  }

  /*
    Tạo sản phẩm mua ngay.
    Không lưu vào cart, nên không ảnh hưởng giỏ hàng cũ.
  */
  buyNowItem = createCurrentCartItem();

  /*
    openCheckoutModal() nằm trong header.js.
    product-detail.html đã load header.js trước product-detail.js nên gọi được.
  */
  if (typeof openCheckoutModal === "function") {
    openCheckoutModal("buy-now", [buyNowItem]);
  } else {
    console.log("Chưa tìm thấy openCheckoutModal(). Kiểm tra lại header.js.");
  }
}
/* =========================
   Product detail image zoom
   Chỉ dùng cho desktop
   ========================= */

function isDesktopImageZoom() {
  return window.innerWidth > 992;
}

function updateProductImageZoomPosition(e, imageItem) {
  let itemOffset = imageItem.offset();
  let itemWidth = imageItem.outerWidth();
  let itemHeight = imageItem.outerHeight();

  let x = ((e.pageX - itemOffset.left) / itemWidth) * 100;
  let y = ((e.pageY - itemOffset.top) / itemHeight) * 100;

  if (x < 0) {
    x = 0;
  }

  if (x > 100) {
    x = 100;
  }

  if (y < 0) {
    y = 0;
  }

  if (y > 100) {
    y = 100;
  }

  imageItem.find("img").css("transform-origin", x + "% " + y + "%");
}

function initProductImageZoom() {
  /*
    Click vào từng ảnh bên trái để bật / tắt zoom.
    Mỗi ảnh tự xử lý riêng, không ảnh hưởng ảnh khác.
  */
  $(document).on("click", ".product-detail-image-item", function (e) {
    if (!isDesktopImageZoom()) {
      return;
    }

    let imageItem = $(this);

    imageItem.toggleClass("is-zoomed");

    if (imageItem.hasClass("is-zoomed")) {
      updateProductImageZoomPosition(e, imageItem);
    } else {
      imageItem.find("img").css("transform-origin", "center center");
    }
  });

  /*
    Khi ảnh đang zoom, rê chuột tới đâu thì vùng đó được phóng to.
  */
  $(document).on(
    "mousemove",
    ".product-detail-image-item.is-zoomed",
    function (e) {
      if (!isDesktopImageZoom()) {
        return;
      }

      updateProductImageZoomPosition(e, $(this));
    },
  );

  /*
    Nếu đang zoom mà thu nhỏ xuống mobile/tablet thì tắt zoom,
    tránh ảnh bị scale khi người dùng vuốt trên mobile.
  */
  $(window).on("resize", function () {
    if (!isDesktopImageZoom()) {
      $(".product-detail-image-item").removeClass("is-zoomed");
      $(".product-detail-image-item img").css(
        "transform-origin",
        "center center",
      );
    }
  });
}
$(document).ready(async function () {
  renderProductDetailSkeleton();
  renderRecommendProductsSkeleton();
  /*
    Trường hợp khách mở thẳng trang sản phẩm
    rồi mới bấm Đồng ý trên banner.
  */
  document.addEventListener(
    "melanie:tracking-consent-changed",
    function (event) {
      const detail = event.detail || {};

      if (detail.allowed === true) {
        trackCurrentProductView();
      }
    },
  );

  await loadProductDetail();
  renderProductDetail();

  scheduleRecommendProductsLoad();

  initProductImageZoom();
  initSizeGuideModal();

  $(document).on("click", ".size-option", function () {
    if ($(this).hasClass("disabled") || $(this).prop("disabled")) {
      return;
    }

    $(".size-option").removeClass("active");
    $(this).addClass("active");

    selectedSize = $(this).data("size");

    $("#sizeMessage").text(
      t("product.sizeSelected") + " " + selectedSize + ".",
    );
  });

  $("#btnAddToCartDetail").click(function () {
    addProductToCart();
  });

  $("#btnBuyNow").click(function () {
    openBuyNowCheckoutModal();
  });

  $("#btnToggleDetail").click(function () {
    if (window.innerWidth > 768) {
      return;
    }

    $(".product-detail-accordion").toggleClass("active");

    if ($(".product-detail-accordion").hasClass("active")) {
      $(".detail-toggle-icon").text("-");
    } else {
      $(".detail-toggle-icon").text("+");
    }
  });
  $(document).on("melanie:order-created", async function () {
    selectedSize = "";
    currentProduct = null;
    productSource = [];

    await loadProductDetail();
    renderProductDetail();

    scheduleRecommendProductsLoad();

    $("#sizeMessage").empty();
  });
});
