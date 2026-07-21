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
   Header search
   Dùng chung cho ô tìm kiếm trên header
   ========================= */

let headerSearchProducts = [];
let headerSearchTimer = null;

const HEADER_SEARCH_LIMIT = 6;

function escapeHeaderSearchHtml(value) {
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

function formatHeaderSearchMoney(price) {
  return Number(price || 0).toLocaleString("vi-VN") + "đ";
}

function isHeaderLocalDevHost() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:"
  );
}

async function loadHeaderSearchProducts() {
  if (headerSearchProducts.length > 0) {
    return headerSearchProducts;
  }

  try {
    /*
      Dùng chung Promise và cache với products.js.
      Không tự gọi GET /products riêng nữa.
    */
    headerSearchProducts = await window.MelanieProductApi.getProducts();
  } catch (error) {
    console.log("Cannot load header search products:", error);

    if (isHeaderLocalDevHost() && typeof products !== "undefined") {
      headerSearchProducts = products;
    } else {
      headerSearchProducts = [];
    }
  }

  return headerSearchProducts;
}

function getHeaderSearchKeyword() {
  return String($("#searchInput").val() || "").trim();
}

function normalizeHeaderSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function productMatchesHeaderSearch(product, keyword) {
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

function getHeaderProductDetailUrl(product) {
  const productSlug = product.slug || product.productSlug || "";

  if (productSlug) {
    return "product-detail.html?slug=" + encodeURIComponent(productSlug);
  }

  if (product.id) {
    return "product-detail.html?id=" + encodeURIComponent(product.id);
  }

  return "products.html";
}

function submitHeaderSearch() {
  const keyword = getHeaderSearchKeyword();

  if (keyword === "") {
    $("#searchSuggest").hide();
    return;
  }

  window.location.href = "products.html?search=" + encodeURIComponent(keyword);
}

async function renderHeaderSearchSuggest() {
  const rawKeyword = getHeaderSearchKeyword();
  const keyword = normalizeHeaderSearchText(rawKeyword);

  if (keyword === "") {
    $("#searchSuggest").hide();
    return;
  }

  $("#searchSuggest")
    .html(
      `
      <div class="suggest-empty">
        Đang tìm sản phẩm...
      </div>
    `,
    )
    .show();

  const productList = await loadHeaderSearchProducts();

  /*
    Nếu trong lúc chờ API mà người dùng đã đổi từ khóa,
    không render kết quả cũ nữa.
  */
  if (normalizeHeaderSearchText(getHeaderSearchKeyword()) !== keyword) {
    return;
  }

  const result = productList
    .filter(function (product) {
      return productMatchesHeaderSearch(product, keyword);
    })
    .slice(0, HEADER_SEARCH_LIMIT);

  if (result.length === 0) {
    $("#searchSuggest")
      .html(
        `
        <div class="suggest-empty">
          ${t("search.empty")}
        </div>
      `,
      )
      .show();

    return;
  }

  let html = "";

  for (let i = 0; i < result.length; i++) {
    const product = result[i];
    const detailUrl = getHeaderProductDetailUrl(product);

    html += `
      <a href="${detailUrl}" class="suggest-item">
        <img
          src="${escapeHeaderSearchHtml(product.image)}"
          alt="${escapeHeaderSearchHtml(getProductName(product))}"
        />

        <div class="suggest-info">
          <h5>${escapeHeaderSearchHtml(getProductName(product))}</h5>
          <p>${formatHeaderSearchMoney(product.price)}</p>
          <small>${escapeHeaderSearchHtml(getProductCategory(product))}</small>
        </div>
      </a>
    `;
  }

  $("#searchSuggest").html(html).show();
}

function initHeaderSearchEvents() {
  $(document).on("input", "#searchInput", function () {
    clearTimeout(headerSearchTimer);

    headerSearchTimer = setTimeout(function () {
      renderHeaderSearchSuggest();
    }, 250);
  });

  $(document).on("keydown", "#searchInput", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitHeaderSearch();
    }
  });

  $(document).on("click", "#btnSearch", function (event) {
    event.preventDefault();
    submitHeaderSearch();
  });

  $(document).on("submit", ".search-box-dropdown", function (event) {
    event.preventDefault();
    submitHeaderSearch();
  });

  $(document).on("click", ".suggest-item", function () {
    $(".search-box-dropdown").removeClass("active");
    $("#searchSuggest").hide();
  });
}

/* =========================
   Checkout modal
   Thanh toán ngay trên modal, không chuyển trang checkout.html
   ========================= */

let checkoutModalItems = [];

let checkoutModalMode = "cart";
let checkoutCreatedOrder = null;
let checkoutPaymentPollingTimer = null;
let checkoutPaymentPollCount = 0;

let checkoutAppliedCoupon = null;
let checkoutSubtotalAmount = 0;
let checkoutDiscountAmount = 0;
let checkoutFinalTotalAmount = 0;
let checkoutPublicCoupons = [];

const CHECKOUT_PAYMENT_POLL_INTERVAL_MS = 5000;
const CHECKOUT_PAYMENT_POLL_LIMIT = 120;

/* =========================
   Meta Pixel - Checkout events
   Không gửi thông tin cá nhân của khách hàng
   ========================= */

function createCheckoutMetaParameters(items, valueOverride) {
  const safeItems = Array.isArray(items) ? items : [];

  const contents = [];
  const contentIds = [];

  let calculatedValue = 0;
  let totalQuantity = 0;

  for (let i = 0; i < safeItems.length; i++) {
    const item = safeItems[i];

    const productId = String(item.id || "").trim();

    const quantity = Math.max(1, Number(item.quantity) || 1);

    const itemPrice = Math.max(0, Number(item.price) || 0);

    if (productId === "") {
      continue;
    }

    contents.push({
      id: productId,
      quantity: quantity,
      item_price: Math.round(itemPrice),
    });

    if (!contentIds.includes(productId)) {
      contentIds.push(productId);
    }

    calculatedValue += itemPrice * quantity;
    totalQuantity += quantity;
  }

  if (contents.length === 0) {
    return null;
  }

  const overrideNumber = Number(valueOverride);

  const finalValue =
    Number.isFinite(overrideNumber) && overrideNumber > 0
      ? overrideNumber
      : calculatedValue;

  return {
    content_ids: contentIds,
    content_type: "product",
    contents: contents,
    num_items: totalQuantity,
    value: Math.round(finalValue),
    currency: "VND",
  };
}

function createCheckoutMetaDedupeKey() {
  const itemKey = checkoutModalItems
    .map(function (item) {
      return [item.id, item.size, item.quantity, item.price].join("-");
    })
    .join("|");

  return [window.location.pathname, checkoutModalMode, itemKey].join(":");
}

function trackCheckoutInitiated() {
  if (
    !window.MelanieMetaPixel ||
    typeof window.MelanieMetaPixel.trackStandardOnce !== "function"
  ) {
    return false;
  }

  const parameters = createCheckoutMetaParameters(checkoutModalItems);

  if (!parameters) {
    return false;
  }

  /*
    Không gửi trùng nếu cùng một giỏ hàng
    mở lại checkout trong lần mở trang hiện tại.
  */
  return window.MelanieMetaPixel.trackStandardOnce(
    "InitiateCheckout",
    createCheckoutMetaDedupeKey(),
    parameters,
    "memory",
  );
}

function trackCheckoutPurchase(paymentData) {
  if (
    !window.MelanieMetaPixel ||
    typeof window.MelanieMetaPixel.trackStandardOnce !== "function"
  ) {
    return false;
  }

  const payment = paymentData || {};

  const orderCode = String(
    payment.order_code || checkoutCreatedOrder?.order_code || "",
  ).trim();

  /*
    Không có mã đơn thì không gửi Purchase,
    vì không thể chống trùng an toàn.
  */
  if (orderCode === "") {
    return false;
  }

  const paidAmount = Number(
    payment.paid_amount ||
      payment.total_amount ||
      checkoutCreatedOrder?.total_amount ||
      0,
  );

  const parameters = createCheckoutMetaParameters(
    checkoutModalItems,
    paidAmount,
  );

  if (!parameters) {
    return false;
  }

  /*
    orderCode chỉ dùng làm khóa chống trùng trong localStorage.
    Không gửi mã đơn hàng sang Meta.
  */
  return window.MelanieMetaPixel.trackStandardOnce(
    "Purchase",
    orderCode,
    parameters,
    "local",
  );
}

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

    <button
      type="button"
      class="checkout-voucher-toggle"
      id="btnToggleCheckoutVoucher"
    >
      <span>Voucher của shop</span>
      <strong id="checkoutVoucherSelectedText">Chọn hoặc nhập mã ›</strong>
    </button>

    <div class="checkout-voucher-box" id="checkoutVoucherBox">
      <div
        class="checkout-public-coupon-list"
        id="checkoutPublicCouponList"
      >
        <div class="checkout-voucher-empty">
          Đang tải voucher...
        </div>
      </div>

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

      <div
        class="checkout-discount-message"
        id="checkoutDiscountMessage"
      ></div>
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

<div class="checkout-money-row" id="checkoutDiscountRow" style="display: none">
  <span>
    ${t("checkout.discount")}
    <small id="checkoutDiscountCodeText"></small>
  </span>
  <strong id="checkoutModalDiscount">-0đ</strong>
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

                  <p id="checkoutAccountHint">
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

                  <div class="checkout-field">
  <input
    type="email"
    id="modalCustomerEmail"
    placeholder="Email"
  />
  <span class="form-error" id="errModalCustomerEmail"></span>
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
                    <div class="checkout-payment-note">
  <p>
    Mã QR thanh toán sẽ được tạo sau khi bạn bấm
    <strong>Đặt hàng</strong>.
  </p>
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
<!-- Màn hình thanh toán QR sau khi đơn hàng đã được tạo -->
<div class="checkout-payment-box" id="checkoutPaymentBox" style="display: none">
  <h3>Quét mã QR để thanh toán</h3>

  <p>
    Đơn hàng của bạn đã được tạo. Vui lòng chuyển khoản đúng số tiền
    và đúng nội dung bên dưới để hệ thống tự xác nhận.
  </p>

  <div class="checkout-qr-box">
  <div class="checkout-payment-qr-col">
  <img
    id="checkoutPaymentQrImage"
    src=""
    alt="QR thanh toán Melanie Mira"
  />

  <div class="checkout-payment-qr-empty" id="checkoutPaymentQrEmpty">
    QR thanh toán sẽ hiển thị sau khi cấu hình tài khoản ngân hàng.
  </div>
</div>

    <div class="checkout-qr-info">
      <h4>Thông tin thanh toán</h4>

      <p>
        Mã đơn:
        <strong id="checkoutPaymentOrderCode"></strong>
      </p>

      <p>
        Số tiền:
        <strong id="checkoutPaymentAmount"></strong>
      </p>

      <p>
        Nội dung chuyển khoản:
        <strong id="checkoutPaymentContent"></strong>
      </p>

      <p id="checkoutPaymentBankInfo"></p>

      <p class="checkout-payment-waiting">
        Sau khi thanh toán, hệ thống sẽ tự kiểm tra giao dịch.
        Vui lòng không tắt trang này ngay.
      </p>
      <p class="checkout-payment-status" id="checkoutPaymentStatusMessage">
  Đang chờ thanh toán...
</p>
    </div>
  </div>

  <button type="button" id="btnCheckoutPaymentClose">
    Tiếp tục mua sắm
  </button>
</div>
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
      stock: items[i].stock,
    });
  }

  return result;
}

function normalizeCheckoutCouponCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function getCheckoutSubtotalAmount() {
  let subtotal = 0;

  for (let i = 0; i < checkoutModalItems.length; i++) {
    subtotal +=
      Number(checkoutModalItems[i].price) *
      Number(checkoutModalItems[i].quantity);
  }

  return subtotal;
}

function showCheckoutDiscountMessage(message, type) {
  const messageBox = $("#checkoutDiscountMessage");

  messageBox
    .removeClass("text-success text-danger text-muted")
    .text(message || "");

  if (!message) {
    return;
  }

  if (type === "success") {
    messageBox.addClass("text-success");
    return;
  }

  if (type === "error") {
    messageBox.addClass("text-danger");
    return;
  }

  messageBox.addClass("text-muted");
}

function resetCheckoutCouponState() {
  checkoutAppliedCoupon = null;
  checkoutDiscountAmount = 0;
  checkoutFinalTotalAmount = 0;

  $("#checkoutDiscountMessage").text("");
  $("#checkoutDiscountRow").hide();
  $("#checkoutModalDiscount").text("-0đ");
  $("#checkoutDiscountCodeText").text("");
  updateCheckoutVoucherSelectedText();
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

  checkoutSubtotalAmount = subtotal + shipping;
  checkoutFinalTotalAmount = checkoutSubtotalAmount - checkoutDiscountAmount;

  if (checkoutFinalTotalAmount < 0) {
    checkoutFinalTotalAmount = 0;
  }

  $("#checkoutModalSummary").html(html);
  $("#checkoutModalSubtotal").text(formatCartMoney(subtotal));
  $("#checkoutModalShipping").text(formatCartMoney(shipping));

  if (checkoutAppliedCoupon && checkoutDiscountAmount > 0) {
    $("#checkoutDiscountRow").show();
    $("#checkoutModalDiscount").text(
      "-" + formatCartMoney(checkoutDiscountAmount),
    );
    $("#checkoutDiscountCodeText").text(
      "(" + checkoutAppliedCoupon.coupon_code + ")",
    );
  } else {
    $("#checkoutDiscountRow").hide();
    $("#checkoutModalDiscount").text("-0đ");
    $("#checkoutDiscountCodeText").text("");
  }

  $("#checkoutModalTotal").text(formatCartMoney(checkoutFinalTotalAmount));
}

function resetCheckoutModalForm() {
  stopCheckoutPaymentPolling();

  $("#checkoutModalForm").show();
  $("#checkoutPaymentBox").hide();
  $("#checkoutSuccessBox").hide();
  checkoutCreatedOrder = null;

  $("#modalCustomerName").val("");
  $("#modalCustomerAddress").val("");
  $("#modalCustomerPhone").val("");
  $("#modalCustomerEmail").val("");
  $("#modalDiscountCode").val("");

  resetCheckoutCouponState();

  $("#checkoutModal .form-error").text("");
}

function getPaymentConfig() {
  return window.MELANIE_MIRA_CONFIG || {};
}

function isMissingPaymentConfig(value) {
  if (!value) {
    return true;
  }

  const text = String(value).trim();

  return (
    text === "" ||
    text === "SO_TAI_KHOAN_CUA_SHOP" ||
    text === "TEN_HOAC_CODE_NGAN_HANG"
  );
}

function buildPaymentQrUrl(order) {
  const config = getPaymentConfig();

  const qrBaseUrl = config.PAYMENT_QR_BASE_URL || "https://qr.sepay.vn/img";
  const bankAccount = config.PAYMENT_BANK_ACCOUNT || "";
  const bankCode = config.PAYMENT_BANK_CODE || "";
  const accountName = config.PAYMENT_ACCOUNT_NAME || "";
  const storeName = config.PAYMENT_STORE_NAME || "Melanie Mira";
  const template = config.PAYMENT_QR_TEMPLATE || "compact";

  if (isMissingPaymentConfig(bankAccount) || isMissingPaymentConfig(bankCode)) {
    return "";
  }

  const amount = Math.round(Number(order.total_amount || 0));
  const paymentContent = order.payment_content || order.order_code;

  const params = new URLSearchParams();

  params.set("acc", bankAccount);
  params.set("bank", bankCode);
  params.set("amount", String(amount));
  params.set("des", paymentContent);
  params.set("template", template);
  params.set("download", "false");
  params.set("showinfo", "true");

  if (accountName) {
    params.set("holder", accountName);
  }

  if (storeName) {
    params.set("store", storeName);
  }

  return qrBaseUrl + "?" + params.toString();
}

function showCheckoutPaymentBox(order) {
  checkoutCreatedOrder = order;

  const qrUrl = buildPaymentQrUrl(order);
  const paymentContent = order.payment_content || order.order_code;
  const amount = Number(order.total_amount || 0);
  const config = getPaymentConfig();

  $("#checkoutModalForm").hide();
  $("#checkoutSuccessBox").hide();
  $("#checkoutPaymentBox").show();

  $("#checkoutPaymentOrderCode").text(order.order_code || order.order_id);
  $("#checkoutPaymentAmount").text(formatCartMoney(amount));
  $("#checkoutPaymentContent").text(paymentContent);

  $("#checkoutPaymentBankInfo").html(`
    Ngân hàng: <strong>${config.PAYMENT_BANK_CODE || "Chưa cấu hình"}</strong>
    <br />
    Tài khoản: <strong>${config.PAYMENT_BANK_ACCOUNT || "Chưa cấu hình"}</strong>
    <br />
    Chủ tài khoản: <strong>${config.PAYMENT_ACCOUNT_NAME || "Chưa cấu hình"}</strong>
  `);

  if (qrUrl) {
    $("#checkoutPaymentQrImage").attr("src", qrUrl).show();
    $("#checkoutPaymentQrEmpty").hide();
  } else {
    $("#checkoutPaymentQrImage").attr("src", "").hide();
    $("#checkoutPaymentQrEmpty").show();
  }
  startCheckoutPaymentPolling();
}

function getCustomerTokenForCheckout() {
  return localStorage.getItem("customerToken");
}

function isCheckoutCustomerLoggedIn() {
  return !!getCustomerTokenForCheckout();
}

function updateCheckoutVoucherSelectedText() {
  if (checkoutAppliedCoupon) {
    $("#checkoutVoucherSelectedText").text(
      checkoutAppliedCoupon.coupon_code + " ›",
    );
    return;
  }

  $("#checkoutVoucherSelectedText").text("Chọn hoặc nhập mã ›");
}

function getCouponPublicText(coupon) {
  let discountText = "";

  if (coupon.discount_type === "fixed") {
    discountText = "Giảm " + formatCartMoney(Number(coupon.discount_value));
  } else {
    discountText = "Giảm " + Number(coupon.discount_value) + "%";

    if (coupon.max_discount_amount !== null) {
      discountText +=
        " tối đa " + formatCartMoney(Number(coupon.max_discount_amount));
    }
  }

  return (
    discountText +
    " cho đơn từ " +
    formatCartMoney(Number(coupon.min_order_amount || 0))
  );
}

async function fetchCheckoutPublicCoupons() {
  const headers = {};
  const token = getCustomerTokenForCheckout();

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const response = await fetch(API_BASE_URL + "/coupons/public", {
    method: "GET",
    headers: headers,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Không thể tải voucher của shop.");
  }

  return result.data || [];
}

function renderCheckoutPublicCoupons() {
  if (checkoutPublicCoupons.length === 0) {
    $("#checkoutPublicCouponList").html(`
      <div class="checkout-voucher-empty">
        Hiện chưa có voucher công khai.
      </div>
    `);

    return;
  }

  let html = "";

  for (let i = 0; i < checkoutPublicCoupons.length; i++) {
    const coupon = checkoutPublicCoupons[i];
    const isUsed = Number(coupon.used_by_me || 0) === 1;
    const isDisabled = isUsed ? "disabled" : "";

    html += `
      <button
        type="button"
        class="checkout-public-coupon-item btn-select-public-coupon"
        data-code="${coupon.code}"
        ${isDisabled}
      >
        <span>
          <strong>${coupon.code}</strong>
          <small>${coupon.name || getCouponPublicText(coupon)}</small>
        </span>

        <em>${isUsed ? "Đã dùng" : "Chọn"}</em>
      </button>
    `;
  }

  $("#checkoutPublicCouponList").html(html);
}

async function loadCheckoutPublicCoupons() {
  $("#checkoutPublicCouponList").html(`
    <div class="checkout-voucher-empty">
      Đang tải voucher...
    </div>
  `);

  try {
    checkoutPublicCoupons = await fetchCheckoutPublicCoupons();
    renderCheckoutPublicCoupons();
  } catch (error) {
    $("#checkoutPublicCouponList").html(`
      <div class="checkout-voucher-empty">
        ${error.message}
      </div>
    `);
  }
}

function isDefaultAddress(address) {
  return (
    address.is_default === 1 ||
    address.is_default === true ||
    address.is_default === "1"
  );
}

function buildCheckoutAddressText(address) {
  let parts = [];

  if (address.address) {
    parts.push(address.address);
  }

  if (address.city) {
    parts.push(address.city);
  }

  if (address.country) {
    parts.push(address.country);
  }

  return parts.join(", ");
}

async function fetchCheckoutProfile() {
  const token = getCustomerTokenForCheckout();

  if (!token) {
    return null;
  }

  const response = await fetch(API_BASE_URL + "/my/profile", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  const result = await response.json();

  if (!result.success) {
    return null;
  }

  return result.data;
}

async function fetchCheckoutAddresses() {
  const token = getCustomerTokenForCheckout();

  if (!token) {
    return [];
  }

  const response = await fetch(API_BASE_URL + "/my/addresses", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  const result = await response.json();

  if (!result.success) {
    return [];
  }

  return result.data;
}

async function prefillCheckoutModalFromAccount() {
  const token = getCustomerTokenForCheckout();

  if (!token) {
    updateCheckoutAccountHint(null);
    return;
  }

  try {
    const profile = await fetchCheckoutProfile();
    const addresses = await fetchCheckoutAddresses();
    updateCheckoutAccountHint(profile);

    if (profile) {
      $("#modalCustomerName").val(profile.full_name || "");
      $("#modalCustomerPhone").val(profile.phone || "");
      $("#modalCustomerEmail").val(profile.email || "");
    }

    if (addresses.length > 0) {
      let defaultAddress = addresses.find(function (address) {
        return isDefaultAddress(address);
      });

      if (!defaultAddress) {
        defaultAddress = addresses[0];
      }

      $("#modalCustomerName").val(
        defaultAddress.full_name || $("#modalCustomerName").val(),
      );
      $("#modalCustomerPhone").val(
        defaultAddress.phone || $("#modalCustomerPhone").val(),
      );
      $("#modalCustomerAddress").val(buildCheckoutAddressText(defaultAddress));
    }
  } catch (error) {
    console.log("Cannot prefill checkout modal:", error);
  }
}

function updateCheckoutAccountHint(profile) {
  if (profile) {
    $("#checkoutAccountHint").html(`
      <span>Đang mua với tài khoản:</span>
      <strong>${profile.email}</strong>
    `);

    return;
  }

  $("#checkoutAccountHint").html(`
    <span>${t("checkout.hasAccount")}</span>
    <a href="login.html">${t("account.login")}</a>
  `);
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
  prefillCheckoutModalFromAccount();
  loadCheckoutPublicCoupons();

  /*
    Nếu đang mở cart modal thì đóng lại trước,
    tránh 2 modal đè lên nhau.
  */
  if (typeof closeHeaderCartModal === "function") {
    closeHeaderCartModal();
  }
  $("#checkoutModalOverlay").addClass("active");
  $("#checkoutModal").addClass("active");

  /*
  Checkout đã được mở với ít nhất một sản phẩm hợp lệ.
*/
  trackCheckoutInitiated();
}

function stopCheckoutPaymentPolling() {
  if (checkoutPaymentPollingTimer) {
    clearInterval(checkoutPaymentPollingTimer);
    checkoutPaymentPollingTimer = null;
  }

  checkoutPaymentPollCount = 0;
}

function showCheckoutPaymentStatusMessage(message, type) {
  $("#checkoutPaymentStatusMessage")
    .removeClass(
      "checkout-payment-status-waiting checkout-payment-status-success checkout-payment-status-error",
    )
    .text(message);

  if (type === "success") {
    $("#checkoutPaymentStatusMessage").addClass(
      "checkout-payment-status-success",
    );
  } else if (type === "error") {
    $("#checkoutPaymentStatusMessage").addClass(
      "checkout-payment-status-error",
    );
  } else {
    $("#checkoutPaymentStatusMessage").addClass(
      "checkout-payment-status-waiting",
    );
  }
}

async function applyCheckoutCoupon() {
  const couponCode = normalizeCheckoutCouponCode($("#modalDiscountCode").val());
  const subtotalAmount = getCheckoutSubtotalAmount();

  if (!isCheckoutCustomerLoggedIn()) {
    resetCheckoutCouponState();
    renderCheckoutModalSummary();
    showCheckoutDiscountMessage(
      "Vui lòng đăng nhập để áp dụng mã giảm giá.",
      "error",
    );
    return;
  }

  if (!couponCode) {
    resetCheckoutCouponState();
    renderCheckoutModalSummary();
    showCheckoutDiscountMessage("Vui lòng nhập mã giảm giá.", "error");
    return;
  }

  if (subtotalAmount <= 0) {
    resetCheckoutCouponState();
    renderCheckoutModalSummary();
    showCheckoutDiscountMessage("Tổng đơn hàng không hợp lệ.", "error");
    return;
  }

  const applyButton = $("#btnModalApplyDiscount");
  const oldButtonText = applyButton.text();

  applyButton.prop("disabled", true).text("Đang áp dụng...");

  try {
    const response = await fetch(API_BASE_URL + "/coupons/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getCustomerTokenForCheckout(),
      },
      body: JSON.stringify({
        code: couponCode,
        subtotal_amount: subtotalAmount,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể áp dụng mã giảm giá.");
    }

    checkoutAppliedCoupon = result.data;
    checkoutDiscountAmount = Number(result.data.discount_amount || 0);
    checkoutFinalTotalAmount = Number(result.data.total_amount || 0);

    $("#modalDiscountCode").val(result.data.coupon_code);
    updateCheckoutVoucherSelectedText();

    renderCheckoutModalSummary();

    showCheckoutDiscountMessage(
      "Đã áp dụng mã " +
        result.data.coupon_code +
        ". Bạn được giảm " +
        formatCartMoney(checkoutDiscountAmount) +
        ".",
      "success",
    );
  } catch (error) {
    resetCheckoutCouponState();
    renderCheckoutModalSummary();
    showCheckoutDiscountMessage(error.message, "error");
  } finally {
    applyButton.prop("disabled", false).text(oldButtonText);
  }
}

async function fetchCheckoutPaymentStatus(orderCode) {
  const apiUrl = window.MELANIE_MIRA_CONFIG.API_BASE_URL;

  const response = await fetch(
    apiUrl + "/orders/payment-status/" + encodeURIComponent(orderCode),
    {
      method: "GET",
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Không thể kiểm tra thanh toán.");
  }

  return result.data;
}

function showCheckoutPaymentSuccess(paymentData) {
  stopCheckoutPaymentPolling();

  const isEnglish = getCurrentLanguage() === "en";
  const paidAmount = Number(
    paymentData.paid_amount || paymentData.total_amount || 0,
  );

  /*
  Chỉ gửi Purchase khi backend đã xác nhận
  thanh toán paid hoặc overpaid.
*/
  trackCheckoutPurchase(paymentData);

  $("#checkoutPaymentBox").hide();
  $("#checkoutModalForm").hide();

  $("#checkoutSuccessBox h3").text(
    isEnglish ? "Payment successful!" : "Thanh toán thành công!",
  );

  $("#checkoutSuccessBox > p")
    .first()
    .text(
      isEnglish
        ? "We have received your payment. Melanie Mira will confirm and process your order soon."
        : "Melanie Mira đã nhận được thanh toán. Shop sẽ kiểm tra và xác nhận đơn hàng sớm nhất.",
    );

  $("#checkoutSuccessTotal").text(formatCartMoney(paidAmount));

  $("#checkoutSuccessBox").show();
  $("#btnCheckoutSuccessClose").text(
    isEnglish ? "Continue shopping" : "Tiếp tục mua sắm",
  );
}

async function checkCheckoutPaymentStatus() {
  if (!checkoutCreatedOrder || !checkoutCreatedOrder.order_code) {
    stopCheckoutPaymentPolling();
    return;
  }

  checkoutPaymentPollCount++;

  try {
    const paymentData = await fetchCheckoutPaymentStatus(
      checkoutCreatedOrder.order_code,
    );

    if (
      paymentData.payment_status === "paid" ||
      paymentData.payment_status === "overpaid"
    ) {
      showCheckoutPaymentSuccess(paymentData);
      return;
    }

    if (paymentData.payment_status === "underpaid") {
      showCheckoutPaymentStatusMessage(
        "Shop đã nhận được một phần thanh toán. Vui lòng chuyển khoản bổ sung phần còn thiếu.",
        "error",
      );
      return;
    }

    showCheckoutPaymentStatusMessage(
      "Đang chờ thanh toán. Hệ thống sẽ tự kiểm tra sau vài giây...",
      "waiting",
    );

    if (checkoutPaymentPollCount >= CHECKOUT_PAYMENT_POLL_LIMIT) {
      stopCheckoutPaymentPolling();

      showCheckoutPaymentStatusMessage(
        "Chưa ghi nhận thanh toán. Nếu bạn đã chuyển khoản, vui lòng liên hệ shop để được kiểm tra.",
        "error",
      );
    }
  } catch (error) {
    console.log("Cannot check payment status:", error);

    showCheckoutPaymentStatusMessage(
      "Tạm thời chưa kiểm tra được thanh toán. Hệ thống sẽ thử lại sau vài giây.",
      "error",
    );
  }
}

function startCheckoutPaymentPolling() {
  stopCheckoutPaymentPolling();

  checkoutPaymentPollCount = 0;

  showCheckoutPaymentStatusMessage(
    "Đang chờ thanh toán. Hệ thống sẽ tự kiểm tra sau vài giây...",
    "waiting",
  );

  checkCheckoutPaymentStatus();

  checkoutPaymentPollingTimer = setInterval(function () {
    checkCheckoutPaymentStatus();
  }, CHECKOUT_PAYMENT_POLL_INTERVAL_MS);
}

function closeCheckoutModal() {
  stopCheckoutPaymentPolling();

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

async function submitOrderToApi() {
  let apiUrl = window.MELANIE_MIRA_CONFIG.API_BASE_URL;

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
    customer_email: $("#modalCustomerEmail").val().trim() || null,
    customer_phone: $("#modalCustomerPhone").val().trim(),
    customer_address: $("#modalCustomerAddress").val().trim(),
    note: null,
    coupon_code: checkoutAppliedCoupon
      ? checkoutAppliedCoupon.coupon_code
      : null,

    /*
    Modal hiện tại của bạn đang dùng QR.
    Backend đang nhận payment_method là 'cod' hoặc 'bank_transfer'.
    QR thực chất là chuyển khoản, nên gửi bank_transfer.
  */
    payment_method: "bank_transfer",

    items: orderItems,
  };

  let headers = {
    "Content-Type": "application/json",
  };

  let customerToken = getCustomerTokenForCheckout();

  if (customerToken) {
    headers.Authorization = "Bearer " + customerToken;
  }

  let response = await fetch(apiUrl + "/orders", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(orderData),
  });

  let result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Cannot create order");
  }

  return result.data;
}

function validateCheckoutItemsStock() {
  for (let i = 0; i < checkoutModalItems.length; i++) {
    let item = checkoutModalItems[i];
    let stock = getCartItemStock(item);

    if (stock !== null && item.quantity > stock) {
      alert(
        "Sản phẩm size " +
          item.size +
          " chỉ còn " +
          stock +
          " sản phẩm. Vui lòng giảm số lượng.",
      );

      return false;
    }
  }

  return true;
}

async function submitCheckoutModal() {
  if (checkoutModalItems.length === 0) {
    alert(t("alert.cartEmpty"));
    return;
  }

  if (!validateCheckoutModalForm()) {
    return;
  }

  if (!validateCheckoutItemsStock()) {
    return;
  }

  const typedCouponCode = normalizeCheckoutCouponCode(
    $("#modalDiscountCode").val(),
  );

  if (typedCouponCode && !isCheckoutCustomerLoggedIn()) {
    showCheckoutDiscountMessage(
      "Vui lòng đăng nhập để áp dụng mã giảm giá.",
      "error",
    );
    return;
  }

  if (
    typedCouponCode &&
    (!checkoutAppliedCoupon ||
      typedCouponCode !== checkoutAppliedCoupon.coupon_code)
  ) {
    alert("Vui lòng bấm Áp dụng mã giảm giá trước khi đặt hàng.");
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

    showCheckoutPaymentBox(orderResult);

    $(document).trigger("melanie:order-created");
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
    applyCheckoutCoupon();
  });

  $(document).on("click", "#btnToggleCheckoutVoucher", function () {
    $("#checkoutVoucherBox").toggleClass("active");
  });

  $(document).on("click", ".btn-select-public-coupon", function () {
    const couponCode = $(this).data("code");

    if (!isCheckoutCustomerLoggedIn()) {
      showCheckoutDiscountMessage(
        "Vui lòng đăng nhập để áp dụng mã giảm giá.",
        "error",
      );
      return;
    }

    $("#modalDiscountCode").val(couponCode);
    applyCheckoutCoupon();
  });

  $(document).on("input", "#modalDiscountCode", function () {
    const typedCouponCode = normalizeCheckoutCouponCode($(this).val());

    if (
      checkoutAppliedCoupon &&
      typedCouponCode !== checkoutAppliedCoupon.coupon_code
    ) {
      resetCheckoutCouponState();
      renderCheckoutModalSummary();

      if (typedCouponCode) {
        showCheckoutDiscountMessage(
          "Mã giảm giá đã thay đổi. Vui lòng bấm Áp dụng lại.",
          "normal",
        );
      }
    }
  });

  $(document).on("click", "#btnCheckoutPaymentClose", function () {
    closeCheckoutModal();
    window.location.href = "products.html";
  });

  $(document).on("click", "#btnCheckoutSuccessClose", function () {
    closeCheckoutModal();

    if (getCustomerTokenForCheckout()) {
      window.location.href = "profile.html";
      return;
    }

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

function getCartItemStock(cartItem) {
  /*
    Ưu tiên lấy stock đã lưu trong cart.
    Stock này được thêm từ product-detail.js khi user chọn size.
  */
  if (cartItem.stock !== undefined && cartItem.stock !== null) {
    return Number(cartItem.stock);
  }

  /*
    Nếu sản phẩm trong products-data.js có sizes thì lấy tiếp từ đó.
    Nếu không có thì trả null, nghĩa là chưa kiểm tra được tồn kho ở frontend.
  */
  let product = getCartProduct(cartItem);

  if (!product || !product.sizes) {
    return null;
  }

  for (let i = 0; i < product.sizes.length; i++) {
    if (product.sizes[i].size === cartItem.size) {
      return Number(product.sizes[i].stock);
    }
  }

  return null;
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
${
  getCartItemStock(cart[i]) !== null
    ? `<p>Còn lại: ${getCartItemStock(cart[i])}</p>`
    : ""
}
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
    let stock = getCartItemStock(cart[index]);

    if (stock !== null && cart[index].quantity >= stock) {
      alert("Bạn đã thêm tối đa số lượng còn lại của size này.");
      return;
    }

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
  return localStorage.getItem("language") || "vi";
}

function setCurrentLanguage(language) {
  localStorage.setItem("language", language);
}
function applyLanguageFont() {
  let language = getCurrentLanguage();
  document.documentElement.lang = language;

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
    "topbar.newCustomerOffer":
      "NHẬP MÃ BANMOI ĐỂ NHẬN ƯU ĐÃI 10% CHO ĐƠN HÀNG ĐẦU TIÊN",
    "topbar.designVibes": "Design your own vibes",

    "topbar.freeship": "Freeship cho mọi đơn hàng",
    "topbar.loginTrack": "Đăng nhập để theo dõi đơn hàng dễ dàng",
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
    "product.sizeGuide": "Hướng dẫn chọn size",
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
      "Vui lòng kiểm tra đơn hàng và nhập thông tin nhận hàng.",
    "checkout.qrPaymentTitle": "Thanh toán online bằng mã QR",
    "checkout.qrPaymentDesc":
      'Vui lòng hoàn tất thanh toán trước khi chọn "Tiếp tục mua sắm"',
    "checkout.qrScanTitle": "Quét mã QR để thanh toán",
    "checkout.qrScanNote":
      "Mã QR thanh toán sẽ được tạo sau khi đơn hàng được ghi nhận.",
    "checkout.successTitle": "Đặt hàng thành công!",
    "checkout.successDesc":
      "Cảm ơn bạn đã mua hàng tại Melanie Mira. Shop sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất.",
    "checkout.continueShopping": "Tiếp tục mua sắm",
  },

  en: {
    "topbar.newCustomerOffer":
      "USE CODE BANMOI TO GET 10% OFF YOUR FIRST ORDER",
    "topbar.designVibes": "Design your own vibes",

    "topbar.freeship": "Free shipping on every order",
    "topbar.loginTrack": "Log in to track your orders easily",
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

    "product.sizeGuide": "Size Guide",
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
      "Please review your order and enter your shipping information.",
    "checkout.qrPaymentTitle": "Online payment by QR code",
    "checkout.qrPaymentDesc":
      'Please complete your payment before choosing "Continue shopping"',
    "checkout.qrScanTitle": "Scan QR code to pay",
    "checkout.qrScanNote":
      "The payment QR code will be generated after your order is created.",
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

function updateAccountIconLink() {
  const customerToken = localStorage.getItem("customerToken");

  if (customerToken) {
    $(".account-toggle").attr("href", "profile.html");
    $(".account-toggle").attr("title", "Tài khoản của tôi");
    return;
  }

  $(".account-toggle").attr("href", "login.html");
  $(".account-toggle").attr("title", "Đăng nhập");
}

$(document).ready(function () {
  applyLanguageFont();
  createSharedCartModal();
  updateCartCount();
  applyStaticLanguage();
  updateAccountIconLink();
  initSharedCartModalEvents();
  initCheckoutModalEvents();
  initHeaderSearchEvents();

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
