function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

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

function searchProductFromCart() {
  let keyword = $("#searchInput").val().trim();

  if (keyword === "") {
    return;
  }

  window.location.href = "products.html?search=" + encodeURIComponent(keyword);
}

$(document).ready(function () {
  updateCartCount();

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

