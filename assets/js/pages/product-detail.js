let currentProduct = null;
let selectedSize = "";

function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

function getProductIdFromUrl() {
  let params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
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
  let sameCategoryProducts = products.filter(function (item) {
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
    let otherProducts = products.filter(function (item) {
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
      <a href="product-detail.html?id=${suggestProducts[i].id}" class="recommend-item">
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
  let productId = getProductIdFromUrl();

  currentProduct = products.find(function (product) {
    return product.id === productId;
  });

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

function addProductToCart(showModal) {
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
    cart.push({
      id: currentProduct.id,
      price: currentProduct.price,
      image: currentProduct.image,
      size: selectedSize,
      quantity: 1,
    });
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

  if (showModal) {
    openCartModal();
  }
}
function renderCartModal() {
  let cart = getCart();
  let html = "";
  let total = 0;

  if (cart.length === 0) {
    $("#cartModalList").html(`
      <div class="cart-modal-empty">
        ${t("cart.empty")}
      </div>
    `);

    $("#cartModalTotal").text(formatMoney(0));
    return;
  }

  for (let i = 0; i < cart.length; i++) {
    let product = products.find(function (p) {
      return p.id === cart[i].id;
    });

    let productName = product ? getProductName(product) : "Product";

    let itemTotal = cart[i].price * cart[i].quantity;
    total += itemTotal;

    html += `
      <div class="cart-modal-item">
        <div class="cart-modal-img">
          <img src="${cart[i].image}" alt="${productName}" />
        </div>

        <div class="cart-modal-info">
         <div class="cart-modal-name-price">
  <div class="cart-modal-product-text">
    <h4>${productName}</h4>
    <p>Size: ${cart[i].size}</p>
  </div>

  <span>${formatMoney(cart[i].price)}</span>
</div>

          <button
            type="button"
            class="cart-modal-remove"
            data-index="${i}"
          >
            ${t("cart.remove")}
          </button>

          <div class="cart-modal-quantity">
            <button type="button" class="cart-qty-minus" data-index="${i}">
              −
            </button>

            <span>${cart[i].quantity}</span>

            <button type="button" class="cart-qty-plus" data-index="${i}">
              +
            </button>
          </div>
        </div>
      </div>
    `;
  }

  $("#cartModalList").html(html);
  $("#cartModalTotal").text(formatMoney(total));
}

function openCartModal() {
  renderCartModal();

  $("#cartModalOverlay").addClass("active");
  $("#cartSideModal").addClass("active");
}

function closeCartModal() {
  $("#cartModalOverlay").removeClass("active");
  $("#cartSideModal").removeClass("active");
}

function changeCartQuantity(index, type) {
  let cart = getCart();

  if (!cart[index]) {
    return;
  }

  if (type === "plus") {
    cart[index].quantity += 1;
  }

  if (type === "minus") {
    cart[index].quantity -= 1;

    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
  }

  saveCart(cart);
  renderCartModal();

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }
}

function removeCartItem(index) {
  let cart = getCart();

  cart.splice(index, 1);

  saveCart(cart);
  renderCartModal();

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }
}

function clearCartModal() {
  saveCart([]);
  renderCartModal();

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }
}

function initCartModalEvents() {
  $("#btnCloseCartModal").click(function () {
    closeCartModal();
  });

  $("#cartModalOverlay").click(function () {
    closeCartModal();
  });

  $("#btnClearCartModal").click(function () {
    clearCartModal();
  });

  $("#btnCartCheckout").click(function () {
    window.location.href = "checkout.html";
  });

  $(document).on("click", ".cart-qty-plus", function () {
    let index = Number($(this).data("index"));
    changeCartQuantity(index, "plus");
  });

  $(document).on("click", ".cart-qty-minus", function () {
    let index = Number($(this).data("index"));
    changeCartQuantity(index, "minus");
  });

  $(document).on("click", ".cart-modal-remove", function () {
    let index = Number($(this).data("index"));
    removeCartItem(index);
  });
}
$(document).ready(function () {
  renderProductDetail();
  initCartModalEvents();

  $(".size-option").click(function () {
    $(".size-option").removeClass("active");
    $(this).addClass("active");

    selectedSize = $(this).data("size");
    $("#sizeMessage").text(
      t("product.sizeSelected") + " " + selectedSize + ".",
    );
  });

  $("#btnAddToCartDetail").click(function () {
    addProductToCart(true);
  });

  $("#btnBuyNow").click(function () {
    addProductToCart(false);

    if (selectedSize !== "") {
      window.location.href = "checkout.html";
    }
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
