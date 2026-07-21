/* =========================
   SEO trang danh sách sản phẩm
   ========================= */

const PRODUCTS_PAGE_URL = "https://melaniemira.com.vn/products.html";

function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

function hasDiscountPrice(product) {
  let price = Number(product.price);
  let oldPrice = Number(product.oldPrice);

  return oldPrice > 0 && oldPrice > price;
}

function createProductPriceHtml(product) {
  if (hasDiscountPrice(product)) {
    return `
      <div class="product-card-price has-old-price">
        <span class="product-price-old">${formatMoney(product.oldPrice)}</span>
        <span class="product-price-current">${formatMoney(product.price)}</span>
      </div>
    `;
  }

  return `
    <div class="product-card-price">
      <span class="product-price-current">${formatMoney(product.price)}</span>
    </div>
  `;
}

function getUrlParam(name) {
  let params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/* =========================
   Meta Pixel - Search
   ========================= */

function trackProductsSearchEvent(searchKeyword) {
  const keyword = String(searchKeyword || "").trim();

  if (
    keyword === "" ||
    !window.MelanieMetaPixel ||
    typeof window.MelanieMetaPixel.trackStandardOnce !== "function"
  ) {
    return;
  }

  /*
    Mỗi lần mở trang chỉ gửi một Search.
    Nếu renderProducts() chạy lại vì đổi ngôn ngữ,
    sự kiện sẽ không bị gửi trùng.
  */
  const dedupeKey = window.location.pathname + window.location.search;

  window.MelanieMetaPixel.trackStandardOnce(
    "Search",
    dedupeKey,
    {
      search_string: keyword.slice(0, 100),
    },
    "memory",
  );
}

let productSource = [];

let productLoadError = "";

function isLocalDevHost() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:"
  );
}

async function loadProducts() {
  productLoadError = "";

  try {
    productSource = await window.MelanieProductApi.getProducts();
  } catch (error) {
    console.log("Cannot load products from API:", error);

    /*
      Chỉ fallback products-data.js khi test local.
      Trên domain thật không dùng dữ liệu cũ.
    */
    if (isLocalDevHost() && typeof products !== "undefined") {
      productSource = products;
      return;
    }

    productSource = [];

    productLoadError =
      error.message ||
      "Không thể tải sản phẩm từ hệ thống. Vui lòng thử lại sau.";
  }
}

function isValidSeoCategory(categorySlug) {
  return (
    categorySlug === "set-quan-ao" ||
    categorySlug === "vay-ngan" ||
    categorySlug === "ao"
  );
}

function getCategoryTitle(categorySlug) {
  if (categorySlug === "set-quan-ao") {
    return {
      title: t("category.set"),
      desc:
        getCurrentLanguage() === "en"
          ? "Elegant sets that are easy to style for different occasions."
          : "Các set đồ thanh lịch, dễ phối và phù hợp nhiều dịp khác nhau.",
    };
  }

  if (categorySlug === "vay-ngan") {
    return {
      title: t("category.dress"),
      desc:
        getCurrentLanguage() === "en"
          ? "Feminine dresses for outings, parties and daily styling."
          : "Những mẫu váy nữ tính, nổi bật và dễ ứng dụng trong nhiều hoàn cảnh.",
    };
  }

  if (categorySlug === "ao") {
    return {
      title: t("category.top"),
      desc:
        getCurrentLanguage() === "en"
          ? "Tops, lace blouses and everyday pieces that are easy to mix."
          : "Áo kiểu, áo ren và áo thun dễ mặc, dễ phối với nhiều phong cách.",
    };
  }

  return {
    title: t("footer.products"),
    desc:
      getCurrentLanguage() === "en"
        ? "Explore elegant and feminine fashion designs from Melanie Mira."
        : "Khám phá các thiết kế thời trang nữ thanh lịch, nữ tính và dễ ứng dụng.",
  };
}

function getProductsSeoTitle(categorySlug, searchKeyword) {
  const isEnglish = getCurrentLanguage() === "en";

  if (searchKeyword) {
    return isEnglish
      ? `Search results for "${searchKeyword}" | Melanie Mira`
      : `Kết quả tìm kiếm "${searchKeyword}" | Melanie Mira`;
  }

  if (categorySlug === "set-quan-ao") {
    return isEnglish
      ? "Women's Fashion Sets | Melanie Mira"
      : "Set đồ nữ thanh lịch | Melanie Mira";
  }

  if (categorySlug === "vay-ngan") {
    return isEnglish
      ? "Women's Dresses | Melanie Mira"
      : "Váy nữ thanh lịch | Melanie Mira";
  }

  if (categorySlug === "ao") {
    return isEnglish
      ? "Women's Tops | Melanie Mira"
      : "Áo nữ thanh lịch | Melanie Mira";
  }

  if (categorySlug && !isValidSeoCategory(categorySlug)) {
    return isEnglish
      ? "Products | Melanie Mira"
      : "Sản phẩm thời trang nữ | Melanie Mira";
  }

  return isEnglish
    ? "Elegant Women's Fashion | Melanie Mira"
    : "Thời trang nữ thanh lịch | Melanie Mira";
}

function getProductsCanonicalUrl(categorySlug, searchKeyword) {
  /*
    Trang tìm kiếm và danh mục không hợp lệ
    đều canonical về trang sản phẩm chính.
  */
  if (searchKeyword || (categorySlug && !isValidSeoCategory(categorySlug))) {
    return PRODUCTS_PAGE_URL;
  }

  if (categorySlug) {
    return PRODUCTS_PAGE_URL + "?category=" + encodeURIComponent(categorySlug);
  }

  return PRODUCTS_PAGE_URL;
}

function getProductsRobotsContent(categorySlug, searchKeyword) {
  /*
    Không cho Google index URL tìm kiếm
    hoặc category không tồn tại.
  */
  if (searchKeyword || (categorySlug && !isValidSeoCategory(categorySlug))) {
    return "noindex, follow";
  }

  return "index, follow";
}

function updateProductsSeo(categorySlug, searchKeyword, pageInfo) {
  const title = getProductsSeoTitle(categorySlug, searchKeyword);

  const description = pageInfo.desc;
  const canonicalUrl = getProductsCanonicalUrl(categorySlug, searchKeyword);

  const robotsContent = getProductsRobotsContent(categorySlug, searchKeyword);

  document.title = title;

  $("#seoDescription").attr("content", description);
  $("#seoRobots").attr("content", robotsContent);
  $("#seoCanonical").attr("href", canonicalUrl);

  $("#seoOgTitle").attr("content", title);
  $("#seoOgDescription").attr("content", description);
  $("#seoOgUrl").attr("content", canonicalUrl);

  $("#seoTwitterTitle").attr("content", title);
  $("#seoTwitterDescription").attr("content", description);
}

function createProductItem(product, productIndex) {
  const hoverImage = product.hoverImage || product.images?.[1] || product.image;

  const productSlug = product.slug || product.productSlug || "";

  const detailUrl = productSlug
    ? "product-detail.html?slug=" + encodeURIComponent(productSlug)
    : product.id
      ? "product-detail.html?id=" + encodeURIComponent(product.id)
      : "products.html";

  /*
    Bốn sản phẩm đầu thường nằm trong màn hình đầu tiên.
    Các sản phẩm còn lại được lazy load.
  */
  const isPriorityProduct = productIndex < 4;

  const loadingMode = isPriorityProduct ? "eager" : "lazy";

  const fetchPriority = isPriorityProduct ? "high" : "low";

  return `
    <div class="col-lg-3 col-md-4 col-6">
      <a href="${detailUrl}" class="shop-product-item">
        <div class="shop-product-image">
          <img
            class="shop-product-img-main"
            src="${product.image}"
            alt="${getProductName(product)}"
            loading="${loadingMode}"
            fetchpriority="${fetchPriority}"
            decoding="async"
          />

          <img
            class="shop-product-img-hover"
            data-hover-src="${hoverImage}"
            alt=""
            aria-hidden="true"
            decoding="async"
          />
        </div>

        <div class="shop-product-info">
          <h3>${getProductName(product)}</h3>
          ${createProductPriceHtml(product)}
        </div>
      </a>
    </div>
  `;
}

function loadProductHoverImage(productItem) {
  const item = $(productItem);

  const hoverImage = item.find(".shop-product-img-hover").get(0);

  if (!hoverImage) {
    return;
  }

  /*
    Không tải lại nếu ảnh đang tải,
    đã tải xong hoặc từng bị lỗi.
  */
  if (hoverImage.dataset.hoverState) {
    return;
  }

  const hoverSrc = String(hoverImage.dataset.hoverSrc || "").trim();

  if (hoverSrc === "") {
    return;
  }

  hoverImage.dataset.hoverState = "loading";

  hoverImage.addEventListener(
    "load",
    function () {
      hoverImage.dataset.hoverState = "loaded";

      /*
        Chỉ cho phép chuyển ảnh sau khi
        ảnh hover đã tải hoàn chỉnh.
      */
      item.addClass("is-hover-image-ready");
    },
    {
      once: true,
    },
  );

  hoverImage.addEventListener(
    "error",
    function () {
      hoverImage.dataset.hoverState = "error";
    },
    {
      once: true,
    },
  );

  hoverImage.src = hoverSrc;
}

function initProductHoverImageLoading() {
  /*
    Desktop: tải ảnh khi rê chuột vào card.
    Bàn phím: tải khi tab tới card.

    Không dùng touchstart để mobile
    không tải ảnh hover không cần thiết.
  */
  $(document).on("mouseenter focusin", ".shop-product-item", function () {
    loadProductHoverImage(this);
  });
}

function productMatchesSearch(product, keyword) {
  const searchText = [
    product.nameVi,
    product.nameEn,
    product.categoryVi,
    product.categoryEn,
    product.categorySlug,
    product.slug,
    product.productSlug,
    product.descriptionVi,
    product.descriptionEn,
  ]
    .join(" ")
    .toLowerCase();

  return searchText.includes(keyword);
}

function renderProductsSkeleton() {
  let html = "";

  /*
    Hiển thị 8 card giả trong lúc chờ API.
    Desktop tương ứng 2 hàng, mobile tương ứng 4 hàng.
  */
  for (let i = 0; i < 8; i++) {
    html += `
      <div
        class="col-lg-3 col-md-4 col-6"
        aria-hidden="true"
      >
        <div class="product-skeleton-card">
          <div class="skeleton-block product-skeleton-image"></div>

          <div class="product-skeleton-info">
            <div class="skeleton-block product-skeleton-name"></div>
            <div class="skeleton-block product-skeleton-name short"></div>
            <div class="skeleton-block product-skeleton-price"></div>
          </div>
        </div>
      </div>
    `;
  }

  $("#productsEmpty").hide();

  $("#productsList").attr("aria-busy", "true").html(html);
}

function renderProducts() {
  let categorySlug = getUrlParam("category");
  let searchKeyword = getUrlParam("search");

  let result = productSource;

  if (categorySlug) {
    result = result.filter(function (product) {
      return product.categorySlug === categorySlug;
    });
  }

  if (searchKeyword) {
    let keyword = searchKeyword.trim().toLowerCase();

    result = result.filter(function (product) {
      return productMatchesSearch(product, keyword);
    });
  }

  let pageInfo = getCategoryTitle(categorySlug);

  if (searchKeyword) {
    pageInfo = {
      title:
        getCurrentLanguage() === "en" ? "Search results" : "Kết quả tìm kiếm",
      desc:
        getCurrentLanguage() === "en"
          ? 'Products matching "' + searchKeyword + '".'
          : 'Sản phẩm phù hợp với từ khóa "' + searchKeyword + '".',
    };
  }

  updateProductsSeo(categorySlug, searchKeyword, pageInfo);

  trackProductsSearchEvent(searchKeyword);

  $("#productPageTitle").text(pageInfo.title);

  $(".filter-link").removeClass("active");

  if (categorySlug) {
    $('.filter-link[data-category="' + categorySlug + '"]').addClass("active");
  } else {
    $('.filter-link[data-category="all"]').addClass("active");
  }

  let html = "";

  for (let i = 0; i < result.length; i++) {
    html += createProductItem(result[i], i);
  }

  $("#productsList").attr("aria-busy", "false").html(html);

  if (result.length === 0) {
    if (productLoadError) {
      $("#productsEmpty").text(productLoadError);
    } else {
      $("#productsEmpty").text(t("product.notFound"));
    }

    $("#productsEmpty").show();
  } else {
    $("#productsEmpty").hide();
  }
}

$(document).ready(async function () {
  initProductHoverImageLoading();
  renderProductsSkeleton();
  /*
    Trường hợp khách đang ở trang kết quả rồi mới bấm Đồng ý,
    gửi Search sau khi quyền theo dõi được cấp.
  */
  document.addEventListener(
    "melanie:tracking-consent-changed",
    function (event) {
      const detail = event.detail || {};

      if (detail.allowed === true) {
        trackProductsSearchEvent(getUrlParam("search"));
      }
    },
  );

  await loadProducts();
  renderProducts();
});
