/* =========================
   HEADER - MELANIE MIRA
   ========================= */

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function updateCartCount() {
  let cart = getCart();
  let total = 0;

  for (let i = 0; i < cart.length; i++) {
    total += cart[i].quantity;
  }

  $("#cartCount").text(total);
}
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function formatCartMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}
/* =========================
   Checkout modal
   Thanh toán ngay trên modal, không chuyển trang checkout.html
   ========================= */

let checkoutModalItems = [];
let checkoutModalMode = "cart";

function createCheckoutModal() {
  if ($("#checkoutModalOverlay").length === 0) {
    $("body").append(`
      <div class="checkout-modal-overlay" id="checkoutModalOverlay"></div>
    `);
  }

  if ($("#checkoutModal").length === 0) {
    $("body").append(`
      <div class="checkout-modal" id="checkoutModal">
        <div class="checkout-modal-panel">
          <!-- Header modal -->
         <div class="checkout-modal-header">
  <div>
    <h3>${t("checkout.modalTitle")}</h3>
    <p>${t("checkout.modalDesc")}</p>
  </div>
</div>

          <div class="checkout-modal-body">
            <form id="checkoutModalForm">
              <div class="checkout-layout checkout-modal-layout">

                <!-- 1. Tóm tắt sản phẩm: đưa lên trên thông tin nhận hàng -->
                <aside class="checkout-right">
  <div class="checkout-summary" id="checkoutModalSummary"></div>

  <div class="checkout-discount checkout-modal-discount">
    <h3>${t("checkout.discount")}</h3>

    <div class="checkout-discount-row">
      <input
        type="text"
        id="modalDiscountCode"
        placeholder="${t("checkout.discountCode")}"
      />

      <button type="button" id="btnModalApplyDiscount">
        ${t("checkout.applyDiscount")}
      </button>
    </div>
  </div>

  <div class="checkout-money">
    <div class="checkout-money-row">
      <span>${t("checkout.subtotal")}</span>
      <strong id="checkoutModalSubtotal">0đ</strong>
    </div>

    <div class="checkout-money-row">
      <span>${t("checkout.shipping")}</span>
      <strong id="checkoutModalShipping">0đ</strong>
    </div>

    <div class="checkout-money-row checkout-total-row">
      <span>${t("checkout.orderTotal")}</span>
      <strong id="checkoutModalTotal">0đ</strong>
    </div>
  </div>
</aside>

                <!-- 2. Thông tin nhận hàng -->
                <section class="checkout-left">
                  <div class="checkout-title-row">
                    <h2>${t("checkout.shippingAddress")}</h2>

                    <p>
                      <span>${t("checkout.hasAccount")}</span>
                      <a href="login.html">${t("account.login")}</a>
                    </p>
                  </div>

                  <div class="checkout-field">
                    <input
                      type="text"
                      id="modalCustomerName"
                      placeholder="${t("checkout.name")}"
                    />
                    <span class="form-error" id="errModalCustomerName"></span>
                  </div>

                  <div class="checkout-field">
                    <input
                      type="text"
                      id="modalCustomerAddress"
                      placeholder="${t("checkout.address")}"
                    />
                    <span class="form-error" id="errModalCustomerAddress"></span>
                  </div>

                  <div class="checkout-field">
                    <input
                      type="text"
                      id="modalCustomerPhone"
                      placeholder="${t("checkout.phone")}"
                    />
                    <span class="form-error" id="errModalCustomerPhone"></span>
                  </div>

                  <!-- 3. Phương thức vận chuyển -->
                  <div class="checkout-shipping-method">
                    <h2>${t("checkout.shippingMethod")}</h2>

                    <div class="shipping-method-box">
                      <div>
                        <h4>${t("checkout.standardShipping")}</h4>
                        <p>${t("checkout.shippingNote")}</p>
                      </div>

                      <strong>${t("checkout.freeShipping")}</strong>
                    </div>
                  </div>

                  <!-- 4. Thanh toán QR -->
                  <div class="checkout-payment-method">
                    <h2>${t("checkout.paymentTitle")}</h2>

                    <p>${t("checkout.paymentDesc")}</p>

                    <!-- Không dùng COD, chỉ dùng thanh toán QR -->
                    <input type="hidden" id="modalPaymentMethod" value="qr" />

                    <div class="payment-option active">
                      <div class="payment-option-top">
                        <div class="payment-left">
                          <span class="payment-radio"></span>

                          <strong>${t("checkout.qrPaymentTitle")}</strong>
                        </div>

                        <div class="payment-icons">
                          <span>QR</span>
                          <span>Bank</span>
                        </div>
                      </div>

                      <div class="payment-option-desc">
                        ${t("checkout.qrPaymentDesc")}
                      </div>
                    </div>

                    <div class="checkout-qr-box">
                      <div class="checkout-qr-fake">
                        <span class="qr-corner qr-top-left"></span>
                        <span class="qr-corner qr-top-right"></span>
                        <span class="qr-corner qr-bottom-left"></span>
                        <strong>QR</strong>
                      </div>

                      <div class="checkout-qr-info">
                        <h4>${t("checkout.qrScanTitle")}</h4>
                        <p>${t("checkout.qrScanNote")}</p>

                        <p class="checkout-qr-amount">
                          ${t("checkout.orderTotal")}:
                          <strong id="checkoutQrAmount">0đ</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- 5. Nút đặt hàng -->
                  <button
                    type="submit"
                    class="checkout-submit-btn"
                  >
                    ${t("checkout.placeOrder")}
                  </button>
                </section>
              </div>
            </form>

            <!-- Thông báo đặt hàng thành công -->
            <div class="checkout-success-box" id="checkoutSuccessBox">
              <div class="checkout-success-icon">✓</div>

              <h3>${t("checkout.successTitle")}</h3>

              <p>${t("checkout.successDesc")}</p>

              <p class="checkout-success-total">
                ${t("checkout.orderTotal")}:
                <strong id="checkoutSuccessTotal">0đ</strong>
              </p>

              <button type="button" id="btnCheckoutSuccessClose">
                ${t("checkout.continueShopping")}
              </button>
            </div>
          </div>
        </div>
      </div>
    `);
  }
}

function getCheckoutItemProduct(item) {
  if (typeof products === "undefined") {
    return null;
  }

  return products.find(function (product) {
    return product.id === item.id;
  });
}

function getCheckoutItemName(item) {
  let product = getCheckoutItemProduct(item);

  if (product) {
    return getProductName(product);
  }

  return item.name || "Product";
}

function getCheckoutItemImage(item) {
  let product = getCheckoutItemProduct(item);

  if (item.image) {
    return item.image;
  }

  if (product) {
    return product.image;
  }

  return "";
}

function cloneCheckoutItems(items) {
  let result = [];

  for (let i = 0; i < items.length; i++) {
    result.push({
      id: items[i].id,
      price: items[i].price,
      image: items[i].image,
      size: items[i].size,
      quantity: items[i].quantity,
    });
  }

  return result;
}

function renderCheckoutModalSummary() {
  let html = "";
  let subtotal = 0;
  let shipping = 0;

  if (checkoutModalItems.length === 0) {
    $("#checkoutModalSummary").html(`
      <div class="checkout-empty">
        ${t("checkout.empty")}
      </div>
    `);

    $("#checkoutModalSubtotal").text(formatCartMoney(0));
    $("#checkoutModalShipping").text(formatCartMoney(0));
    $("#checkoutModalTotal").text(formatCartMoney(0));
    $("#checkoutQrAmount").text(formatCartMoney(0));
    return;
  }

  for (let i = 0; i < checkoutModalItems.length; i++) {
    let item = checkoutModalItems[i];
    let productName = getCheckoutItemName(item);
    let productImage = getCheckoutItemImage(item);
    let itemTotal = item.price * item.quantity;

    subtotal += itemTotal;

    html += `
      <div class="checkout-summary-item">
        <div class="checkout-summary-img">
          <img src="${productImage}" alt="${productName}" />
        </div>

        <div class="checkout-summary-info">
          <div class="checkout-summary-top">
            <h4>${productName}</h4>
            <strong>${formatCartMoney(itemTotal)}</strong>
          </div>

          <p>${t("checkout.size")}: ${item.size}</p>
          <p>${t("checkout.qty")}: ${item.quantity}</p>
        </div>
      </div>
    `;
  }

  $("#checkoutModalSummary").html(html);
  $("#checkoutModalSubtotal").text(formatCartMoney(subtotal));
  $("#checkoutModalShipping").text(formatCartMoney(shipping));
  $("#checkoutModalTotal").text(formatCartMoney(subtotal + shipping));
  $("#checkoutQrAmount").text(formatCartMoney(subtotal + shipping));
}

function resetCheckoutModalForm() {
  $("#checkoutModalForm").show();
  $("#checkoutSuccessBox").hide();

  $("#modalCustomerName").val("");
  $("#modalCustomerAddress").val("");
  $("#modalCustomerPhone").val("");
  $("#modalDiscountCode").val("");

  $("#checkoutModal .form-error").text("");
}

function openCheckoutModal(mode, items) {
  checkoutModalMode = mode || "cart";

  if (Array.isArray(items)) {
    checkoutModalItems = cloneCheckoutItems(items);
  } else {
    checkoutModalItems = cloneCheckoutItems(getCart());
  }

  if (checkoutModalItems.length === 0) {
    alert(t("alert.cartEmpty"));
    return;
  }

  createCheckoutModal();
  resetCheckoutModalForm();
  renderCheckoutModalSummary();

  /*
    Nếu đang mở cart modal thì đóng lại trước,
    tránh 2 modal đè lên nhau.
  */
  if (typeof closeHeaderCartModal === "function") {
    closeHeaderCartModal();
  }

  $("#checkoutModalOverlay").addClass("active");
  $("#checkoutModal").addClass("active");
}

function closeCheckoutModal() {
  $("#checkoutModalOverlay").removeClass("active");
  $("#checkoutModal").removeClass("active");
}

function validateCheckoutModalForm() {
  let isValid = true;

  let name = $("#modalCustomerName").val().trim();
  let address = $("#modalCustomerAddress").val().trim();
  let phone = $("#modalCustomerPhone").val().trim();

  $("#checkoutModal .form-error").text("");

  if (name === "") {
    $("#errModalCustomerName").text(t("form.nameRequired"));
    isValid = false;
  }

  if (address === "") {
    $("#errModalCustomerAddress").text(t("form.addressRequired"));
    isValid = false;
  }

  if (phone === "") {
    $("#errModalCustomerPhone").text(t("form.phoneRequired"));
    isValid = false;
  } else if (!/^0\d{9}$/.test(phone)) {
    $("#errModalCustomerPhone").text(t("form.phoneInvalid"));
    isValid = false;
  }

  return isValid;
}

function saveOrderDemo() {
  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  let subtotal = 0;

  for (let i = 0; i < checkoutModalItems.length; i++) {
    subtotal += checkoutModalItems[i].price * checkoutModalItems[i].quantity;
  }

  orders.push({
    customerName: $("#modalCustomerName").val().trim(),
    customerAddress: $("#modalCustomerAddress").val().trim(),
    customerPhone: $("#modalCustomerPhone").val().trim(),
    paymentMethod: "qr",
    items: checkoutModalItems,
    total: subtotal,
    createdAt: new Date().toISOString(),
  });

  localStorage.setItem("orders", JSON.stringify(orders));

  return subtotal;
}

async function submitOrderToApi() {
  let apiUrl =
    typeof API_BASE_URL !== "undefined"
      ? API_BASE_URL
      : "http://localhost:5000/api";

  let orderItems = [];

  for (let i = 0; i < checkoutModalItems.length; i++) {
    orderItems.push({
      product_id: checkoutModalItems[i].id,
      size: checkoutModalItems[i].size,
      quantity: checkoutModalItems[i].quantity,
    });
  }

  let orderData = {
    customer_name: $("#modalCustomerName").val().trim(),
    customer_email: null,
    customer_phone: $("#modalCustomerPhone").val().trim(),
    customer_address: $("#modalCustomerAddress").val().trim(),
    note: $("#modalDiscountCode").val().trim()
      ? "Mã giảm giá: " + $("#modalDiscountCode").val().trim()
      : null,

    /*
      Modal hiện tại của bạn đang dùng QR.
      Backend đang nhận payment_method là 'cod' hoặc 'bank_transfer'.
      QR thực chất là chuyển khoản, nên gửi bank_transfer.
    */
    payment_method: "bank_transfer",

    items: orderItems,
  };

  let response = await fetch(apiUrl + "/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  let result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Cannot create order");
  }

  return result.data;
}

async function submitCheckoutModal() {
  if (checkoutModalItems.length === 0) {
    alert(t("alert.cartEmpty"));
    return;
  }

  if (!validateCheckoutModalForm()) {
    return;
  }

  let submitButton = $(".checkout-submit-btn");
  let oldButtonText = submitButton.text();

  submitButton.prop("disabled", true);
  submitButton.text("Đang xử lý...");

  try {
    let orderResult = await submitOrderToApi();

    /*
      Nếu thanh toán từ giỏ hàng thì xóa giỏ.
      Nếu mua ngay thì không đụng vào giỏ hàng cũ.
    */
    if (checkoutModalMode === "cart") {
      saveCart([]);

      if (typeof updateCartCount === "function") {
        updateCartCount();
      }
    }

    $("#checkoutSuccessTotal").text(
      formatCartMoney(Number(orderResult.total_amount)),
    );

    $("#checkoutModalForm").hide();
    $("#checkoutSuccessBox").show();
  } catch (error) {
    console.log("Create order failed:", error);
    alert(error.message || "Không thể tạo đơn hàng. Vui lòng thử lại.");
  } finally {
    submitButton.prop("disabled", false);
    submitButton.text(oldButtonText);
  }
}

function initCheckoutModalEvents() {
  $(document).on("click", "#btnCloseCheckoutModal", function () {
    closeCheckoutModal();
  });

  $(document).on("click", "#checkoutModalOverlay", function () {
    closeCheckoutModal();
  });

  $(document).on("submit", "#checkoutModalForm", async function (e) {
    e.preventDefault();
    await submitCheckoutModal();
  });

  $(document).on("click", "#btnModalApplyDiscount", function () {
    alert(t("alert.discountDemo"));
  });

  $(document).on("click", "#btnCheckoutSuccessClose", function () {
    closeCheckoutModal();

    window.location.href = "products.html";
  });

  /*
    Chặn các link cũ trỏ tới checkout.html.
    Từ giờ nếu bấm link checkout.html thì mở modal thay vì chuyển trang.
  */
  $(document).on(
    "click",
    'a[href="checkout.html"], .js-open-checkout-modal',
    function (e) {
      e.preventDefault();

      openCheckoutModal("cart", getCart());
    },
  );
}
/* =========================
   Shared cart modal
   Dùng chung cho toàn bộ website
   ========================= */

function createSharedCartModal() {
  if ($("#cartModalOverlay").length === 0) {
    $("body").append(
      `<div class="cart-modal-overlay" id="cartModalOverlay"></div>`,
    );
  }

  if ($("#cartSideModal").length === 0) {
    $("body").append(`
      <div class="cart-side-modal" id="cartSideModal">
        <div class="cart-modal-header">
  <h3 data-i18n="cart.shoppingCart">GIỎ HÀNG</h3>
</div>

        <button
          type="button"
          class="cart-clear-btn"
          id="btnClearCartModal"
          data-i18n="cart.clearAll"
        >
          Xóa tất cả
        </button>

        <div class="cart-modal-summary-line">
          <span data-i18n="cart.totalItems">Tổng sản phẩm</span>
          <strong id="cartModalCountText">0 sản phẩm</strong>
        </div>

        <div class="cart-modal-list" id="cartModalList"></div>

        <div class="cart-modal-bottom">
          <div class="cart-modal-total">
            <span data-i18n="cart.subtotal">Tạm tính</span>
            <strong id="cartModalTotal">0đ</strong>
          </div>

          <button
            type="button"
            class="cart-modal-checkout"
            id="btnCartCheckout"
            data-i18n="cart.checkout"
          >
            Thanh toán
          </button>
        </div>
      </div>
    `);
  }

  /* Nếu trang cũ còn modal nhưng thiếu dòng tổng sản phẩm thì tự thêm */
  if ($("#cartModalCountText").length === 0) {
    $("#btnClearCartModal").after(`
      <div class="cart-modal-summary-line">
        <span data-i18n="cart.totalItems">Tổng sản phẩm</span>
        <strong id="cartModalCountText">0 sản phẩm</strong>
      </div>
    `);
  }
}

function getCartProduct(cartItem) {
  if (typeof products === "undefined") {
    return null;
  }

  return products.find(function (product) {
    return product.id === cartItem.id;
  });
}

function resetCartModalToNormal() {
  $("#cartSideModal").removeClass("buy-now-modal");
  $("#cartSideModal").removeData("buyNowItem");

  $(".cart-modal-header h3").text(t("cart.shoppingCart"));
  $("#btnClearCartModal").show();
  $("#btnClearCartModal").text(t("cart.clearAll"));
  $(".cart-modal-total span").text(t("cart.subtotal"));
  $("#btnCartCheckout").text(t("cart.checkout"));
}

function renderHeaderCartModal() {
  let cart = getCart();
  let html = "";
  let totalMoney = 0;
  let totalQuantity = 0;

  resetCartModalToNormal();

  if (cart.length === 0) {
    $("#cartModalList").html(`
      <div class="cart-modal-empty">
        ${t("cart.empty")}
      </div>
    `);

    $("#cartModalTotal").text(formatCartMoney(0));
    $("#cartModalCountText").text("0 " + t("cart.itemUnit"));
    return;
  }

  for (let i = 0; i < cart.length; i++) {
    let product = getCartProduct(cart[i]);

    let productName = product ? getProductName(product) : "Product";
    let productImage = cart[i].image || (product ? product.image : "");
    let itemTotal = cart[i].price * cart[i].quantity;

    totalMoney += itemTotal;
    totalQuantity += cart[i].quantity;

    html += `
      <div class="cart-modal-item">
        <div class="cart-modal-img">
          <img src="${productImage}" alt="${productName}" />
        </div>

        <div class="cart-modal-info">
          <div class="cart-modal-name-price">
            <div class="cart-modal-product-text">
              <h4>${productName}</h4>
              <p>Size: ${cart[i].size}</p>
            </div>

            <span>${formatCartMoney(cart[i].price)}</span>
          </div>

         

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
  $("#cartModalTotal").text(formatCartMoney(totalMoney));
  $("#cartModalCountText").text(totalQuantity + " " + t("cart.itemUnit"));
}

function openHeaderCartModal() {
  createSharedCartModal();
  renderHeaderCartModal();

  $("#cartModalOverlay").addClass("active");
  $("#cartSideModal").addClass("active");
}

function closeHeaderCartModal() {
  $("#cartModalOverlay").removeClass("active");
  $("#cartSideModal").removeClass("active");

  $("#cartSideModal").removeClass("buy-now-modal");
  $("#cartSideModal").removeData("buyNowItem");
  $("#btnClearCartModal").show();
}

function changeHeaderCartQuantity(index, type) {
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
  updateCartCount();
  renderHeaderCartModal();
}

function clearHeaderCartModal() {
  saveCart([]);
  updateCartCount();
  renderHeaderCartModal();
}

function initSharedCartModalEvents() {
  $(document).on("click", ".cart-link", function (e) {
    e.preventDefault();
    e.stopPropagation();

    openHeaderCartModal();
  });

  $(document).on("click", "#cartModalOverlay", function () {
    closeHeaderCartModal();
  });

  $(document).on("click", "#btnClearCartModal", function () {
    clearHeaderCartModal();
  });

  $(document).on("click", ".cart-qty-plus", function () {
    let index = Number($(this).data("index"));
    changeHeaderCartQuantity(index, "plus");
  });

  $(document).on("click", ".cart-qty-minus", function () {
    let index = Number($(this).data("index"));
    changeHeaderCartQuantity(index, "minus");
  });

  $(document).on("click", "#btnCartCheckout", function () {
    /*
    Trường hợp cũ: modal mua ngay đang dùng cartSideModal.
    Nếu còn class buy-now-modal thì lấy đúng 1 sản phẩm hiện tại.
  */
    if ($("#cartSideModal").hasClass("buy-now-modal")) {
      let buyNowItem = $("#cartSideModal").data("buyNowItem");

      if (buyNowItem) {
        openCheckoutModal("buy-now", [buyNowItem]);
      }

      return;
    }

    /*
    Trường hợp bình thường: thanh toán toàn bộ giỏ hàng.
  */
    if (getCart().length === 0) {
      alert(t("alert.cartEmpty"));
      return;
    }

    openCheckoutModal("cart", getCart());
  });
}
/* =========================
   Language
   ========================= */

function getCurrentLanguage() {
  return localStorage.getItem("language") || "en";
}

function setCurrentLanguage(language) {
  localStorage.setItem("language", language);
}
function applyLanguageFont() {
  let language = getCurrentLanguage();

  /*
    Xóa class font test cũ và class ngôn ngữ cũ.
    Sau đó thêm lại class đúng theo ngôn ngữ hiện tại.
  */
  $("body").removeClass("lang-vi lang-en font-pair-1 font-pair-2 font-pair-3");

  if (language === "en") {
    $("body").addClass("lang-en");
  } else {
    $("body").addClass("lang-vi");
  }
}
function t(key) {
  let language = getCurrentLanguage();
  let dictionary = translations[language];

  return dictionary[key] || key;
}

function getProductName(product) {
  let language = getCurrentLanguage();

  if (language === "en" && product.nameEn) {
    return product.nameEn;
  }

  return product.nameVi || product.name;
}

function getProductDescription(product) {
  let language = getCurrentLanguage();

  if (language === "en" && product.descriptionEn) {
    return product.descriptionEn;
  }

  return product.descriptionVi || product.description;
}

function getProductCategory(product) {
  let language = getCurrentLanguage();

  if (language === "en" && product.categoryEn) {
    return product.categoryEn;
  }

  return product.categoryVi || product.category;
}

/*
  Hàm này đổi trực tiếp name/category/description theo ngôn ngữ.
  Lý do: products.js hiện tại của bạn khả năng đang dùng product.name,
  product.category, product.description.
*/
function applyProductLanguageData() {
  if (typeof products === "undefined") {
    return;
  }

  for (let i = 0; i < products.length; i++) {
    products[i].name = getProductName(products[i]);
    products[i].category = getProductCategory(products[i]);
    products[i].description = getProductDescription(products[i]);
  }
}

const translations = {
  vi: {
    "nav.home": "Trang chủ",
    "nav.products": "Sản phẩm",
    "nav.about": "Giới thiệu",
    "nav.contact": "Liên hệ",

    "search.placeholder": "Tìm kiếm sản phẩm...",
    "search.button": "Tìm",

    "account.login": "Đăng nhập",
    "account.register": "Đăng ký",

    "button.viewMore": "Xem thêm",
    "button.viewDetail": "Xem chi tiết",
    "button.buy": "Mua",
    "button.checkout": "Thanh toán",

    "home.bestSeller": "BEST SELLER",
    "home.categoryTitle": "DANH MỤC SẢN PHẨM",
    "home.fabricTitle": "ĐA DẠNG CHẤT LIỆU",

    "category.all": "Tất cả",
    "category.top": "Áo",
    "category.dress": "Váy",
    "category.set": "Bộ",

    "fabric.silk": "LỤA",
    "fabric.tafta": "TAFTA",
    "fabric.cotton": "COTTON",
    "fabric.lace": "REN",

    "policy.exchangeTitle": "Đổi trả 3 - 5 ngày",
    "policy.exchangeDesc":
      "Hỗ trợ đổi hàng trong vòng 3 - 5 ngày kể từ khi khách hàng nhận được sản phẩm.",
    "policy.conditionTitle": "Điều kiện đổi trả",
    "policy.conditionDesc":
      "Sản phẩm phải còn nguyên vẹn, đầy đủ tem tag, chưa qua sử dụng, giặt tẩy hoặc hư hỏng.",
    "policy.contactTitle": "Liên hệ hỗ trợ",
    "policy.contactDesc":
      "Khách hàng vui lòng liên hệ Melanie Mira qua IG hoặc Facebook để được tư vấn đổi hàng.",
    "policy.checkTitle": "Kiểm tra và đổi hàng",
    "policy.checkDesc":
      "Shop sẽ kiểm tra sản phẩm sau khi nhận lại. Nếu đúng điều kiện, khách sẽ được hỗ trợ đổi sản phẩm.",

    "product.detail": "Chi tiết sản phẩm",
    "product.category": "Danh mục",
    "product.defaultDetail1":
      "Thiết kế phù hợp với phong cách nữ tính và thanh lịch.",
    "product.defaultDetail2":
      "Dễ phối với nhiều phụ kiện và hoàn cảnh sử dụng.",
    "product.sizeRequired": "Vui lòng chọn size trước khi thêm vào giỏ.",
    "product.sizeNeed": "Bạn cần chọn size trước khi thêm vào giỏ.",
    "product.sizeSelected": "Bạn đã chọn size",
    "product.addedSize": "Đã thêm size",
    "product.addedToCart": "vào giỏ hàng.",
    "product.recommend": "Có thể bạn thích",
    "product.notFound": "Không tìm thấy sản phẩm",
    "product.notFoundDesc":
      "Sản phẩm này có thể đã bị xóa hoặc chưa được cập nhật.",
    "product.backToProducts": "Quay lại sản phẩm",

    "cart.shoppingCart": "GIỎ HÀNG",
    "cart.close": "Đóng ×",
    "cart.clearAll": "Xóa tất cả",
    "cart.remove": "Xóa",
    "cart.subtotal": "Tạm tính",
    "cart.totalItems": "Tổng sản phẩm",
    "cart.itemUnit": "sản phẩm",
    "cart.empty": "Giỏ hàng đang trống.",
    "cart.checkout": "Thanh toán",

    "checkout.shippingAddress": "Thông tin nhận hàng",
    "checkout.order": "Đơn hàng",
    "checkout.discount": "Mã giảm giá",
    "checkout.applyDiscount": "Áp dụng",
    "checkout.subtotal": "Tạm tính",
    "checkout.shipping": "Phí vận chuyển",
    "checkout.orderTotal": "Tổng đơn hàng",
    "checkout.empty": "Giỏ hàng đang trống.",
    "checkout.shopNow": "Mua sắm ngay",

    "footer.about": "Giới thiệu",

    "footer.products": "Sản phẩm",
    "footer.contact": "Liên hệ",
    "footer.copyright": "© 2026 Melanie Mira. Đã đăng ký bản quyền.",
    "search.empty": "Không tìm thấy sản phẩm phù hợp",

    "cart.pageTitle": "Giỏ hàng của bạn",
    "cart.pageDesc": "Kiểm tra sản phẩm trước khi tiến hành thanh toán.",
    "cart.continueShopping": "Tiếp tục mua hàng",
    "cart.total": "Tổng tiền:",
    "cart.qty": "Số lượng",
    "cart.size": "Size",

    "checkout.hasAccount": "Đã có tài khoản?",
    "checkout.emailNews": "Gửi email cho tôi về tin tức và ưu đãi",
    "checkout.sameAddress": "Địa chỉ thanh toán và giao hàng giống nhau",
    "checkout.placeOrder": "Đặt hàng",
    "checkout.discountCode": "Mã giảm giá",
    "checkout.qty": "Số lượng",
    "checkout.size": "Size",

    "form.nameRequired": "Vui lòng nhập tên.",
    "form.phoneRequired": "Vui lòng nhập số điện thoại.",
    "form.phoneInvalid": "Số điện thoại gồm 10 số và bắt đầu bằng 0.",
    "form.emailRequired": "Vui lòng nhập email.",
    "form.emailInvalid": "Email không hợp lệ.",
    "form.addressRequired": "Vui lòng nhập địa chỉ nhận hàng.",
    "form.paymentRequired": "Vui lòng chọn phương thức thanh toán.",

    "alert.cartEmpty": "Giỏ hàng đang trống, không thể đặt hàng.",
    "alert.orderSuccess":
      "Đặt hàng thành công! Cảm ơn bạn đã mua hàng tại Melanie Mira.",
    "alert.discountDemo": "Mã giảm giá hiện chưa được áp dụng trong bản demo.",
    "product.consult": "Nhắn tin tư vấn",
    "product.addToCart": "Thêm vào giỏ",
    "checkout.name": "Tên",
    "checkout.address": "Địa chỉ",
    "checkout.phone": "Số điện thoại",
    "checkout.shippingMethod": "Phương thức vận chuyển",
    "checkout.standardShipping": "Giao hàng tiêu chuẩn (3 đến 7 ngày)",
    "checkout.shippingNote": "Nhập địa chỉ cụ thể để giao hàng",
    "checkout.freeShipping": "MIỄN PHÍ",
    "checkout.paymentTitle": "Thanh toán",
    "checkout.paymentDesc": "Toàn bộ các giao dịch được bảo mật và mã hóa.",
    "checkout.modalTitle": "Thanh toán",
    "checkout.modalDesc":
      "Vui lòng kiểm tra đơn hàng và quét mã QR để thanh toán.",
    "checkout.qrPaymentTitle": "Thanh toán online bằng mã QR",
    "checkout.qrPaymentDesc":
      "Quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử để thanh toán đơn hàng.",
    "checkout.qrScanTitle": "Quét mã QR để thanh toán",
    "checkout.qrScanNote":
      "Đây là mã QR demo để kiểm tra giao diện. Sau này có thể thay bằng ảnh QR thật.",
    "checkout.successTitle": "Đặt hàng thành công!",
    "checkout.successDesc":
      "Cảm ơn bạn đã mua hàng tại Melanie Mira. Shop sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất.",
    "checkout.continueShopping": "Tiếp tục mua sắm",
  },

  en: {
    "nav.home": "Home",
    "nav.products": "Shop",
    "nav.about": "About",
    "nav.contact": "Contact",

    "search.placeholder": "Search products...",
    "search.button": "Search",

    "account.login": "Log in",
    "account.register": "Register",

    "button.viewMore": "View more",
    "button.viewDetail": "View details",
    "button.buy": "Buy",
    "button.checkout": "Checkout",

    "home.bestSeller": "BEST SELLER",
    "home.categoryTitle": "PRODUCT CATEGORIES",
    "home.fabricTitle": "FABRICS",

    "category.all": "All",
    "category.top": "Tops",
    "category.dress": "Dresses",
    "category.set": "Sets",

    "fabric.silk": "SILK",
    "fabric.tafta": "TAFTA",
    "fabric.cotton": "COTTON",
    "fabric.lace": "LACE",

    "policy.exchangeTitle": "3 - 5 Day Exchange",
    "policy.exchangeDesc":
      "Exchange support is available within 3 - 5 days from the date the customer receives the product.",
    "policy.conditionTitle": "Exchange Conditions",
    "policy.conditionDesc":
      "Items must remain intact with full tags, unused, unwashed and undamaged.",
    "policy.contactTitle": "Customer Support",
    "policy.contactDesc":
      "Please contact Melanie Mira via Instagram or Facebook for exchange support.",
    "policy.checkTitle": "Product Check & Exchange",
    "policy.checkDesc":
      "The shop will inspect returned products. If eligible, customers will be supported with an exchange.",

    "product.detail": "Product Details",
    "product.category": "Category",
    "product.defaultDetail1":
      "Designed for a feminine, elegant and modern style.",
    "product.defaultDetail2":
      "Easy to mix with accessories for different occasions.",
    "product.sizeRequired": "Please select a size before adding to cart.",
    "product.sizeNeed": "Please select a size before adding to cart.",
    "product.sizeSelected": "You selected size",
    "product.addedSize": "Size",
    "product.addedToCart": "has been added to cart.",
    "product.recommend": "You may also like",
    "product.notFound": "Product not found",
    "product.notFoundDesc":
      "This product may have been removed or has not been updated.",
    "product.backToProducts": "Back to products",
    "cart.shoppingCart": "SHOPPING CART",
    "cart.close": "Close ×",
    "cart.clearAll": "Clear all",
    "cart.remove": "Remove",
    "cart.subtotal": "SUBTOTAL",
    "cart.totalItems": "Total items",
    "cart.itemUnit": "items",
    "cart.empty": "Your cart is empty.",
    "cart.checkout": "Checkout",

    "checkout.shippingAddress": "Shipping Address",
    "checkout.order": "Order",
    "checkout.discount": "Discount",
    "checkout.applyDiscount": "Apply Discount",
    "checkout.subtotal": "Subtotal",
    "checkout.shipping": "Shipping & Handling",
    "checkout.orderTotal": "Order Total",
    "checkout.empty": "Your cart is empty.",
    "checkout.shopNow": "Shop now",

    "footer.about": "About",

    "footer.products": "Products",
    "footer.contact": "Contact",
    "footer.copyright": "© 2026 Melanie Mira. All rights reserved.",
    "search.empty": "No matching products found",

    "cart.pageTitle": "Your Cart",
    "cart.pageDesc": "Review your items before proceeding to checkout.",
    "cart.continueShopping": "Continue shopping",
    "cart.total": "Total:",
    "cart.qty": "Quantity",
    "cart.size": "Size",

    "checkout.hasAccount": "Already have an account?",
    "checkout.emailNews": "Email me with news and offers",
    "checkout.sameAddress": "My billing and shipping address are the same",
    "checkout.placeOrder": "Place order",
    "checkout.discountCode": "Discount code",
    "checkout.qty": "Qty",
    "checkout.size": "Size",

    "form.nameRequired": "Please enter your name.",
    "form.phoneRequired": "Please enter your phone number.",
    "form.phoneInvalid": "Phone number must have 10 digits and start with 0.",
    "form.emailRequired": "Please enter your email.",
    "form.emailInvalid": "Invalid email address.",
    "form.addressRequired": "Please enter your shipping address.",
    "form.paymentRequired": "Please select a payment method.",

    "alert.cartEmpty": "Your cart is empty. You cannot place an order.",
    "alert.orderSuccess":
      "Order placed successfully! Thank you for shopping at Melanie Mira.",
    "alert.discountDemo": "Discount codes are not available in this demo.",
    "product.consult": "Chat for advice",
    "product.addToCart": "Add to cart",
    "checkout.name": "Name",
    "checkout.address": "Address",
    "checkout.phone": "Phone number",
    "checkout.shippingMethod": "Shipping method",
    "checkout.standardShipping": "Standard shipping (3 to 7 days)",
    "checkout.shippingNote": "Enter your address for delivery",
    "checkout.freeShipping": "FREE",
    "checkout.paymentTitle": "Payment",
    "checkout.paymentDesc": "All transactions are secure and encrypted.",
    "checkout.modalTitle": "Checkout",
    "checkout.modalDesc":
      "Please review your order and scan the QR code to pay.",
    "checkout.qrPaymentTitle": "Online payment by QR code",
    "checkout.qrPaymentDesc":
      "Scan the QR code using your banking app or e-wallet to complete the payment.",
    "checkout.qrScanTitle": "Scan QR code to pay",
    "checkout.qrScanNote":
      "This is a demo QR code for testing. You can replace it with a real QR image later.",
    "checkout.successTitle": "Order placed successfully!",
    "checkout.successDesc":
      "Thank you for shopping at Melanie Mira. We will contact you to confirm your order soon.",
    "checkout.continueShopping": "Continue shopping",
  },
};

function applyStaticLanguage() {
  applyLanguageFont();

  let language = getCurrentLanguage();
  let dictionary = translations[language];

  $("[data-i18n]").each(function () {
    let key = $(this).data("i18n");

    if (dictionary[key]) {
      $(this).text(dictionary[key]);
    }
  });

  $("[data-i18n-placeholder]").each(function () {
    let key = $(this).data("i18n-placeholder");

    if (dictionary[key]) {
      $(this).attr("placeholder", dictionary[key]);
    }
  });

  $("[data-i18n-title]").each(function () {
    let key = $(this).data("i18n-title");

    if (dictionary[key]) {
      $(this).attr("title", dictionary[key]);
    }
  });

  $("#currentLanguageBadge").text(language.toUpperCase());

  $(".language-option").removeClass("active");
  $('.language-option[data-lang="' + language + '"]').addClass("active");
}

/* Chạy sớm để products.js dùng được dữ liệu đúng ngôn ngữ */
applyProductLanguageData();

$(document).ready(function () {
  applyLanguageFont();
  createSharedCartModal();
  updateCartCount();
  applyStaticLanguage();
  initSharedCartModalEvents();
  initCheckoutModalEvents();

  function updateLanguageButton() {
    let language = getCurrentLanguage();

    $("#currentLanguageBadge").text(language.toUpperCase());

    $(".language-option").removeClass("active");
    $('.language-option[data-lang="' + language + '"]').addClass("active");
  }

  updateLanguageButton();

  $("#btnLanguage").click(function (e) {
    e.preventDefault();
    e.stopPropagation();

    $("#languageDropdown").toggleClass("active");
  });

  $(".language-option").click(function () {
    let language = $(this).data("lang");

    setCurrentLanguage(language);
    location.reload();
  });

  $(document).click(function (e) {
    if (!$(e.target).closest(".language-box").length) {
      $("#languageDropdown").removeClass("active");
    }
  });

  $("#btnOpenMenu").click(function (e) {
    e.preventDefault();
    e.stopPropagation();

    $("#sideMenu").toggleClass("active");
  });

  $("#btnCloseMenu").click(function () {
    $("#sideMenu").removeClass("active");
  });

  $("#btnProductMenu").click(function (e) {
    e.preventDefault();
    e.stopPropagation();

    $("#productSubMenu").toggleClass("active");
    $(this).toggleClass("active");
  });

  $("#btnOpenSearch").click(function (e) {
    e.preventDefault();
    e.stopPropagation();

    $(".search-box-dropdown").toggleClass("active");
    $("#searchInput").focus();
  });

  $(".menu-contact-link").click(function () {
    $("#sideMenu").removeClass("active");
  });

  $(document).click(function (e) {
    if (!$(e.target).closest(".mobile-menu").length) {
      $("#sideMenu").removeClass("active");
    }

    if (!$(e.target).closest(".header-search").length) {
      $(".search-box-dropdown").removeClass("active");
      $("#searchSuggest").hide();
    }
  });
});
