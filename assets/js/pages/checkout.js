/* =========================
   CHECKOUT PAGE - MELANIE MIRA
   ========================= */

/* Format money */
function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

/* Get cart from localStorage */
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

/* Save cart */
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

/* Render checkout products */
function renderCheckoutSummary() {
  let cart = getCart();
  let html = "";
  let total = 0;

  if (cart.length === 0) {
    $("#checkoutSummary").html(`
      <div class="empty-cart">
        Giỏ hàng đang trống.
        <br />
        <a href="products.html" class="btn-main mt-3">Mua sắm ngay</a>
      </div>
    `);

    $("#checkoutTotal").text(formatMoney(0));
    return;
  }

  for (let i = 0; i < cart.length; i++) {
    let itemTotal = cart[i].price * cart[i].quantity;
    total += itemTotal;

    html += `
      <div class="checkout-item">
        <div class="checkout-item-img">
          <img src="${cart[i].image}" alt="${cart[i].name}" />
        </div>

        <div class="checkout-item-info">
          <h4>${cart[i].name}</h4>
          <p>Size: ${cart[i].size}</p>
          <p>Số lượng: ${cart[i].quantity}</p>
          <strong>${formatMoney(itemTotal)}</strong>
        </div>
      </div>
    `;
  }

  $("#checkoutSummary").html(html);
  $("#checkoutTotal").text(formatMoney(total));
}

/* Validate checkout form */
function validateCheckoutForm() {
  let isValid = true;

  let name = $("#customerName").val().trim();
  let phone = $("#customerPhone").val().trim();
  let email = $("#customerEmail").val().trim();
  let address = $("#customerAddress").val().trim();
  let payment = $("#paymentMethod").val();

  $(".form-error").text("");

  if (name === "") {
    $("#errCustomerName").text("Vui lòng nhập họ tên.");
    isValid = false;
  }

  if (phone === "") {
    $("#errCustomerPhone").text("Vui lòng nhập số điện thoại.");
    isValid = false;
  } else if (!/^0\d{9}$/.test(phone)) {
    $("#errCustomerPhone").text(
      "Số điện thoại phải gồm 10 số và bắt đầu bằng 0.",
    );
    isValid = false;
  }

  if (email === "") {
    $("#errCustomerEmail").text("Vui lòng nhập email.");
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $("#errCustomerEmail").text("Email không hợp lệ.");
    isValid = false;
  }

  if (address === "") {
    $("#errCustomerAddress").text("Vui lòng nhập địa chỉ nhận hàng.");
    isValid = false;
  }

  if (payment === "") {
    $("#errPaymentMethod").text("Vui lòng chọn phương thức thanh toán.");
    isValid = false;
  }

  return isValid;
}

/* Submit order */
function submitOrder() {
  let cart = getCart();

  if (cart.length === 0) {
    alert("Giỏ hàng đang trống, không thể đặt hàng.");
    return;
  }

  if (!validateCheckoutForm()) {
    return;
  }

  alert("Đặt hàng thành công! Cảm ơn bạn đã mua hàng tại Melanie Mira.");

  /* Xóa giỏ hàng sau khi đặt */
  saveCart([]);

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }

  window.location.href = "index.html";
}

/* Document ready */
$(document).ready(function () {
  renderCheckoutSummary();

  $("#checkoutForm").submit(function (e) {
    e.preventDefault();
    submitOrder();
  });
});
