let currentProduct = null;
let selectedSize = "";
let buyNowItem = null;
let productSource = [];

function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

function getProductSlugFromUrl() {
  let params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

function getProductIdFromUrl() {
  let params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
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
  };
}

async function loadProductDetail() {
  let slug = getProductSlugFromUrl();
  let productId = getProductIdFromUrl();

  try {
    if (slug) {
      let response = await fetch(API_BASE_URL + "/products/" + slug);
      let result = await response.json();

      if (result.success) {
        currentProduct = convertApiProduct(result.data);
      }
    }

    /*
      Nếu chưa có currentProduct thì dùng dữ liệu dự phòng từ products-data.js.
      Trường hợp này dùng khi:
      - Backend chưa chạy
      - API lỗi
      - Link cũ vẫn còn dạng product-detail.html?id=1
    */
    if (!currentProduct) {
      if (slug) {
        currentProduct = products.find(function (product) {
          return product.slug === slug;
        });
      } else {
        currentProduct = products.find(function (product) {
          return product.id === productId;
        });
      }
    }

    productSource = products;
  } catch (error) {
    console.log("Cannot load product detail from API:", error);

    if (slug) {
      currentProduct = products.find(function (product) {
        return product.slug === slug;
      });
    } else {
      currentProduct = products.find(function (product) {
        return product.id === productId;
      });
    }

    productSource = products;
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
      <a href="product-detail.html?slug=${suggestProducts[i].slug}" class="recommend-item">
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

  $(".size-option").click(function () {
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
});
