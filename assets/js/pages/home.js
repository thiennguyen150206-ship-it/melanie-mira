function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
  let cart = getCart();
  let total = 0;

  for (let i = 0; i < cart.length; i++) {
    total += cart[i].quantity;
  }

  $("#cartCount").text(total);
}

function createProductCard(product) {
  return `
        <div class="col-lg-4 col-md-6 col-12">
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}">
                    <span class="product-badge">${product.badge}</span>

                    <div class="product-actions">
                        <a href="product-detail.html?id=${product.id}">Chi tiết</a>
                        <button type="button" onclick="addToCart(${product.id})">Thêm giỏ</button>
                    </div>
                </div>

                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-name">${product.name}</h3>

                    <div class="product-price">
                        <span class="current-price">${formatMoney(product.price)}</span>
                        <span class="old-price">${formatMoney(product.oldPrice)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderFeaturedProducts() {
  let html = "";

  let featuredIds = [4, 7, 1];

  let featured = products.filter(function (product) {
    return featuredIds.includes(product.id);
  });

  for (let i = 0; i < featured.length; i++) {
    html += createProductCard(featured[i]);
  }

  $("#featuredProducts").html(html);
}

function addToCart(productId) {
  let product = products.find(function (item) {
    return item.id === productId;
  });

  if (!product) {
    alert("Không tìm thấy sản phẩm.");
    return;
  }

  let cart = getCart();

  let index = cart.findIndex(function (item) {
    return item.id === productId;
  });

  if (index !== -1) {
    cart[index].quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
  }

  saveCart(cart);
  updateCartCount();

  alert("Đã thêm sản phẩm vào giỏ hàng.");
}

function searchProduct() {
  let keyword = $("#searchInput").val().trim().toLowerCase();

  if (keyword === "") {
    renderFeaturedProducts();
    return;
  }

  let result = products.filter(function (product) {
    return (
      product.name.toLowerCase().includes(keyword) ||
      product.category.toLowerCase().includes(keyword)
    );
  });

  let html = "";

  for (let i = 0; i < result.length; i++) {
    html += createProductCard(result[i]);
  }

  if (result.length === 0) {
    html = `
            <div class="col-12 text-center">
                <p>Không tìm thấy sản phẩm phù hợp.</p>
            </div>
        `;
  }

  $("#featuredProducts").html(html);
}

$(document).ready(function () {
  renderFeaturedProducts();
  updateCartCount();

  $("#searchInput").keyup(function (e) {
    showSearchSuggest();

    if (e.key === "Enter") {
      e.preventDefault();
      searchProduct();
      $("#searchSuggest").hide();
    }
  });

  $("#btnSearch").click(function () {
    searchProduct();
    $("#searchSuggest").hide();
  });

  $(document).click(function (e) {
    if (!$(e.target).closest(".search-box").length) {
      $("#searchSuggest").hide();
    }
  });
});

function showSearchSuggest() {
  let keyword = $("#searchInput").val().trim().toLowerCase();

  if (keyword === "") {
    $("#searchSuggest").hide();
    return;
  }

  let result = products.filter(function (product) {
    return (
      product.name.toLowerCase().includes(keyword) ||
      product.category.toLowerCase().includes(keyword)
    );
  });

  let html = "";

  if (result.length === 0) {
    html = `
            <div class="suggest-empty">
                Không tìm thấy sản phẩm phù hợp
            </div>
        `;
  } else {
    for (let i = 0; i < result.length; i++) {
      html += `
                <div class="suggest-item" onclick="goToProductDetail(${result[i].id})">
                    <img src="${result[i].image}" alt="${result[i].name}">

                    <div class="suggest-info">
                        <h5>${result[i].name}</h5>
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
