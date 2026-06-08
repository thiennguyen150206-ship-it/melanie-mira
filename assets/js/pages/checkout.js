/* =========================
   CHECKOUT PAGE - MELANIE MIRA
   ========================= */

function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function renderCheckoutSummary() {
  let cart = getCart();
  let html = "";
  let subtotal = 0;
  let shipping = 0;

  if (cart.length === 0) {
    $("#checkoutSummary").html(`
      <div class="checkout-empty">
        Giỏ hàng đang trống.
        <br />
        <a href="products.html">Mua sắm ngay</a>
      </div>
    `);

    $("#checkoutSubtotal").text(formatMoney(0));
    $("#checkoutShipping").text(formatMoney(0));
    $("#checkoutTotal").text(formatMoney(0));
    return;
  }

  for (let i = 0; i < cart.length; i++) {
    let itemTotal = cart[i].price * cart[i].quantity;
    subtotal += itemTotal;

    html += `
      <div class="checkout-summary-item">
        <div class="checkout-summary-img">
          <img src="${cart[i].image}" alt="${cart[i].name}" />
        </div>

        <div class="checkout-summary-info">
          <div class="checkout-summary-top">
            <h4>${cart[i].name}</h4>
            <strong>${formatMoney(itemTotal)}</strong>
          </div>

          <p>Size: ${cart[i].size}</p>
          <p>Qty: ${cart[i].quantity}</p>
        </div>
      </div>
    `;
  }

  $("#checkoutSummary").html(html);
  $("#checkoutSubtotal").text(formatMoney(subtotal));
  $("#checkoutShipping").text(formatMoney(shipping));
  $("#checkoutTotal").text(formatMoney(subtotal + shipping));
}

function validateCheckoutForm() {
  let isValid = true;

  let firstName = $("#customerFirstName").val().trim();
  let phone = $("#customerPhone").val().trim();
  let email = $("#customerEmail").val().trim();
  let address = $("#customerAddress").val().trim();
  let payment = $("#paymentMethod").val();

  $(".form-error").text("");

  if (firstName === "") {
    $("#errCustomerName").text("Vui lòng nhập tên.");
    isValid = false;
  }

  if (phone === "") {
    $("#errCustomerPhone").text("Vui lòng nhập số điện thoại.");
    isValid = false;
  } else if (!/^0\d{9}$/.test(phone)) {
    $("#errCustomerPhone").text("Số điện thoại gồm 10 số và bắt đầu bằng 0.");
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

  saveCart([]);

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }

  window.location.href = "index.html";
}

$(document).ready(function () {
  renderCheckoutSummary();

  $("#checkoutForm").submit(function (e) {
    e.preventDefault();
    submitOrder();
  });

  $("#btnApplyDiscount").click(function () {
    alert("Mã giảm giá hiện chưa được áp dụng trong bản demo.");
  });
});
