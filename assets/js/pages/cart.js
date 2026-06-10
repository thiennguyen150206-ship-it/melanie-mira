function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function getCartProductName(item) {
  let product = products.find(function (p) {
    return p.id === item.id;
  });

  if (product) {
    return getProductName(product);
  }

  return item.name || "Product";
}

function renderCartPage() {
  let cart = getCart();
  let html = "";
  let total = 0;

  if (cart.length === 0) {
    $("#cartContent").html(`
      <div class="empty-cart">
        ${t("cart.empty")}
      </div>
    `);

    $("#cartTotal").text(formatMoney(0));
    return;
  }

  html += `
    <div class="table-responsive">
      <table class="table align-middle cart-table">
        <thead>
          <tr>
            <th>${t("footer.products")}</th>
            <th>${t("cart.size")}</th>
            <th>${t("cart.qty")}</th>
            <th>${t("cart.subtotal")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
  `;

  for (let i = 0; i < cart.length; i++) {
    let itemTotal = cart[i].price * cart[i].quantity;
    total += itemTotal;

    let productName = getCartProductName(cart[i]);

    html += `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <img src="${cart[i].image}" alt="${productName}" />
            <div>
              <strong>${productName}</strong>
              <div>${formatMoney(cart[i].price)}</div>
            </div>
          </div>
        </td>

        <td>${cart[i].size}</td>

        <td>
          <button type="button" class="btn btn-sm btn-light cart-minus" data-index="${i}">−</button>
          <span class="mx-2">${cart[i].quantity}</span>
          <button type="button" class="btn btn-sm btn-light cart-plus" data-index="${i}">+</button>
        </td>

        <td>${formatMoney(itemTotal)}</td>

        <td>
          <button type="button" class="btn btn-sm btn-outline-danger cart-remove" data-index="${i}">
            ${t("cart.remove")}
          </button>
        </td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  $("#cartContent").html(html);
  $("#cartTotal").text(formatMoney(total));
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
  renderCartPage();

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }
}

function removeCartItem(index) {
  let cart = getCart();

  cart.splice(index, 1);
  saveCart(cart);
  renderCartPage();

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }
}

function showSearchSuggest() {
  let keyword = $("#searchInput").val().trim().toLowerCase();

  if (keyword === "") {
    $("#searchSuggest").hide();
    return;
  }

  let result = products.filter(function (product) {
    return (
      product.nameVi.toLowerCase().includes(keyword) ||
      product.nameEn.toLowerCase().includes(keyword) ||
      product.categoryVi.toLowerCase().includes(keyword) ||
      product.categoryEn.toLowerCase().includes(keyword)
    );
  });

  let html = "";

  if (result.length === 0) {
    html = `
      <div class="suggest-empty">
        ${t("search.empty")}
      </div>
    `;
  } else {
    for (let i = 0; i < result.length; i++) {
      html += `
        <div class="suggest-item" onclick="goToProductDetail(${result[i].id})">
          <img src="${result[i].image}" alt="${getProductName(result[i])}">

          <div class="suggest-info">
            <h5>${getProductName(result[i])}</h5>
            <p>${formatMoney(result[i].price)}</p>
          </div>
        </div>
      `;
    }
  }

  $("#searchSuggest").html(html);
  $("#searchSuggest").show();
}

function goToProductDetail(productId) {
  window.location.href = "product-detail.html?id=" + productId;
}

function searchProductFromCart() {
  let keyword = $("#searchInput").val().trim();

  if (keyword === "") {
    return;
  }

  window.location.href = "products.html?search=" + encodeURIComponent(keyword);
}

$(document).ready(function () {
  renderCartPage();

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }

  $(document).on("click", ".cart-plus", function () {
    let index = Number($(this).data("index"));
    changeCartQuantity(index, "plus");
  });

  $(document).on("click", ".cart-minus", function () {
    let index = Number($(this).data("index"));
    changeCartQuantity(index, "minus");
  });

  $(document).on("click", ".cart-remove", function () {
    let index = Number($(this).data("index"));
    removeCartItem(index);
  });

  $("#searchInput").keyup(function (e) {
    showSearchSuggest();

    if (e.key === "Enter") {
      e.preventDefault();
      searchProductFromCart();
    }
  });

  $("#btnSearch").click(function () {
    searchProductFromCart();
  });

  $(document).click(function (e) {
    if (!$(e.target).closest(".search-box").length) {
      $("#searchSuggest").hide();
    }
  });
});
