function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

function getUrlParam(name) {
  let params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function getCategoryTitle(categorySlug) {
  if (categorySlug === "set-quan-ao") {
    return {
      title: "Bộ",
      desc: "Các set đồ thanh lịch, dễ phối và phù hợp nhiều dịp khác nhau.",
    };
  }

  if (categorySlug === "vay-ngan") {
    return {
      title: "Váy",
      desc: "Những mẫu váy nữ tính, nổi bật và dễ ứng dụng trong nhiều hoàn cảnh.",
    };
  }

  if (categorySlug === "ao") {
    return {
      title: "Áo",
      desc: "Áo kiểu, áo ren và áo thun dễ mặc, dễ phối với nhiều phong cách.",
    };
  }

  return {
    title: "Tất cả sản phẩm",
    desc: "Khám phá các thiết kế thời trang nữ thanh lịch, nữ tính và dễ ứng dụng.",
  };
}

function createProductItem(product) {
  return `
    <div class="col-lg-3 col-md-4 col-6">
      <a href="product-detail.html?id=${product.id}" class="shop-product-item">
        <div class="shop-product-image">
          <img src="${product.image}" alt="${product.name}" />
        </div>

        <div class="shop-product-info">
          <h3>${product.name}</h3>
          <p>${formatMoney(product.price)}</p>
        </div>
      </a>
    </div>
  `;
}

function renderProducts() {
  let categorySlug = getUrlParam("category");
  let searchKeyword = getUrlParam("search");

  let result = products;

  if (categorySlug) {
    result = result.filter(function (product) {
      return product.categorySlug === categorySlug;
    });
  }

  if (searchKeyword) {
    let keyword = searchKeyword.trim().toLowerCase();

    result = result.filter(function (product) {
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword)
      );
    });
  }

  let pageInfo = getCategoryTitle(categorySlug);

  if (searchKeyword) {
    pageInfo = {
      title: "Kết quả tìm kiếm",
      desc: 'Sản phẩm phù hợp với từ khóa "' + searchKeyword + '".',
    };
  }

  $("#productPageTitle").text(pageInfo.title);
  $("#productPageDesc").text(pageInfo.desc);

  $(".filter-link").removeClass("active");

  if (categorySlug) {
    $('.filter-link[data-category="' + categorySlug + '"]').addClass("active");
  } else {
    $('.filter-link[data-category="all"]').addClass("active");
  }

  let html = "";

  for (let i = 0; i < result.length; i++) {
    html += createProductItem(result[i]);
  }

  $("#productsList").html(html);

  if (result.length === 0) {
    $("#productsEmpty").show();
  } else {
    $("#productsEmpty").hide();
  }
}

$(document).ready(function () {
  renderProducts();
});
