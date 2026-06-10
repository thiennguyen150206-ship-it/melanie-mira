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

function getCheckoutProductName(item) {
  let product = products.find(function (p) {
    return p.id === item.id;
  });

  if (product) {
    return getProductName(product);
  }

  return item.name || "Product";
}

function renderCheckoutSummary() {
  let cart = getCart();
  let html = "";
  let subtotal = 0;
  let shipping = 0;

  if (cart.length === 0) {
    $("#checkoutSummary").html(`
      <div class="checkout-empty">
        ${t("checkout.empty")}
        <br />
        <a href="products.html">${t("checkout.shopNow")}</a>
      </div>
    `);

    $("#checkoutSubtotal").text(formatMoney(0));
    $("#checkoutShipping").text(formatMoney(0));
    $("#checkoutTotal").text(formatMoney(0));
    return;
  }

  for (let i = 0; i < cart.length; i++) {
    let productName = getCheckoutProductName(cart[i]);
    let itemTotal = cart[i].price * cart[i].quantity;
    subtotal += itemTotal;

    html += `
      <div class="checkout-summary-item">
        <div class="checkout-summary-img">
          <img src="${cart[i].image}" alt="${productName}" />
        </div>

        <div class="checkout-summary-info">
          <div class="checkout-summary-top">
            <h4>${productName}</h4>
            <strong>${formatMoney(itemTotal)}</strong>
          </div>

          <p>${t("checkout.size")}: ${cart[i].size}</p>
          <p>${t("checkout.qty")}: ${cart[i].quantity}</p>
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

  let name = $("#customerFirstName").val().trim();
  let phone = $("#customerPhone").val().trim();
  let address = $("#customerAddress").val().trim();
  let payment = $("#paymentMethod").val();

  $(".form-error").text("");

  if (name === "") {
    $("#errCustomerName").text(t("form.nameRequired"));
    isValid = false;
  }

  if (address === "") {
    $("#errCustomerAddress").text(t("form.addressRequired"));
    isValid = false;
  }

  if (phone === "") {
    $("#errCustomerPhone").text(t("form.phoneRequired"));
    isValid = false;
  } else if (!/^0\d{9}$/.test(phone)) {
    $("#errCustomerPhone").text(t("form.phoneInvalid"));
    isValid = false;
  }

  if (payment === "") {
    $("#errPaymentMethod").text(t("form.paymentRequired"));
    isValid = false;
  }

  return isValid;
}
function submitOrder() {
  let cart = getCart();

  if (cart.length === 0) {
    alert(t("alert.cartEmpty"));
    return;
  }

  if (!validateCheckoutForm()) {
    return;
  }

  alert(t("alert.orderSuccess"));

  saveCart([]);

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }

  window.location.href = "index.html";
}

$(document).ready(function () {
  renderCheckoutSummary();

  $(".payment-option").click(function () {
    $(".payment-option").removeClass("active");
    $(this).addClass("active");

    let payment = $(this).data("payment");
    $("#paymentMethod").val(payment);
  });

  $("#checkoutForm").submit(function (e) {
    e.preventDefault();
    submitOrder();
  });

  $("#btnApplyDiscount").click(function () {
    alert(t("alert.discountDemo"));
  });
});
