let currentProduct = null;
let selectedSize = "";
let buyNowItem = null;
let productSource = [];

function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
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

async function loadPublicProductsFromApi() {
  let response = await fetch(API_BASE_URL + "/products");
  let result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Cannot load products from API");
  }

  return result.data.map(function (product) {
    return convertApiProduct(product);
  });
}

function convertApiProduct(product) {
  let images = [];

  if (product.images && product.images.length > 0) {
    images = product.images.map(function (item) {
      return item.image_url;
    });
  }

  if (images.length === 0) {
    images = [product.image];

    if (product.hover_image) {
      images.push(product.hover_image);
    }
  }

  return {
    id: product.id,
    slug: product.slug,
    nameVi: product.name_vi,
    nameEn: product.name_en,
    categoryVi: product.category_vi,
    categoryEn: product.category_en,
    categorySlug: product.category_slug,
    price: Number(product.price),
    oldPrice: product.old_price ? Number(product.old_price) : null,
    image: product.image,
    hoverImage: product.hover_image,
    images: images,
    badge: product.badge,
    descriptionVi: product.description_vi,
    descriptionEn: product.description_en,
    sizes: product.sizes || [],
    sizeGuideImage: product.size_guide_image,
  };
}

async function loadProductDetail() {
  let slug = getProductSlugFromUrl();
  let productId = getProductIdFromUrl();

  currentProduct = null;
  productSource = [];

  try {
    /*
      Load danh sách sản phẩm từ API trước.
      Nhờ vậy nếu vào bằng ?id=8 vẫn tìm được slug từ database,
      rồi tiếp tục lấy chi tiết theo slug.
    */
    productSource = await loadPublicProductsFromApi();

    let targetSlug = slug;

    if (!targetSlug && productId) {
      let productFromList = findProductBySlugOrId(
        productSource,
        null,
        productId,
      );

      if (productFromList && productFromList.slug) {
        targetSlug = productFromList.slug;
      }
    }

    if (targetSlug) {
      let response = await fetch(
        API_BASE_URL + "/products/" + encodeURIComponent(targetSlug),
      );

      let result = await response.json();

      if (response.ok && result.success) {
        currentProduct = convertApiProduct(result.data);
      }
    }

    /*
      Nếu API chi tiết chưa lấy được, dùng danh sách API vừa load.
      Vẫn là dữ liệu database, không phải ảnh cũ trong project.
    */
    if (!currentProduct) {
      currentProduct = findProductBySlugOrId(productSource, slug, productId);
    }

    return;
  } catch (error) {
    console.log("Cannot load product detail from API:", error);
  }

  /*
    Chỉ fallback local khi test local.
    Trên domain thật không dùng products-data.js để tránh hiện ảnh cũ.
  */
  if (isLocalDevHost() && typeof products !== "undefined") {
    productSource = products;
    currentProduct = findProductBySlugOrId(products, slug, productId);
  }
}
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
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
  let images = createProductImages(product);
  let html = "";

  for (let i = 0; i < images.length; i++) {
    html += `
      <div class="product-detail-image-item">
        <img src="${images[i]}" alt="${getProductName(product)}" />
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
    $("#btnAddToCartDetail").prop("disabled", false);
    $("#btnBuyNow").prop("disabled", false);
  }
}

function renderProductInfo(product) {
  let name = getProductName(product);
  let description = getProductDescription(product);
  let category = getProductCategory(product);

  $("#detailName").text(name);
  $("#detailPrice").text(formatMoney(product.price));

  $("#detailInfoList").html(`
    <li>${description}</li>
    <li>${t("product.category")}: ${category}</li>
    <li>${t("product.defaultDetail1")}</li>
    <li>${t("product.defaultDetail2")}</li>
  `);

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
  src="${suggestProducts[i].image}"
  alt="${getProductName(suggestProducts[i])}"
/>
<h4>${getProductName(suggestProducts[i])}</h4>
        <p>${formatMoney(suggestProducts[i].price)}</p>
      </a>
    `;
  }

  $("#recommendProducts").html(html);
}

function renderProductDetail() {
  if (!currentProduct) {
    $(".product-detail-page").html(`
      <div class="container py-5 text-center">
        <h2>${t("product.notFound")}</h2>
        <p>${t("product.notFoundDesc")}</p>
        <a href="products.html" class="btn-main">${t("product.backToProducts")}</a>
      </div>
    `);
    return;
  }

  renderProductImages(currentProduct);
  renderProductInfo(currentProduct);
  renderRecommendProducts(currentProduct);
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
  await loadProductDetail();
  renderProductDetail();

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

    await loadProductDetail();
    renderProductDetail();

    $("#sizeMessage").text(t("product.sizeRequired"));
  });
});
