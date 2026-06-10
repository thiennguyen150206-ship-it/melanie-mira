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
      title: t("category.set"),
      desc:
        getCurrentLanguage() === "en"
          ? "Elegant sets that are easy to style for different occasions."
          : "Các set đồ thanh lịch, dễ phối và phù hợp nhiều dịp khác nhau.",
    };
  }

  if (categorySlug === "vay-ngan") {
    return {
      title: t("category.dress"),
      desc:
        getCurrentLanguage() === "en"
          ? "Feminine dresses for outings, parties and daily styling."
          : "Những mẫu váy nữ tính, nổi bật và dễ ứng dụng trong nhiều hoàn cảnh.",
    };
  }

  if (categorySlug === "ao") {
    return {
      title: t("category.top"),
      desc:
        getCurrentLanguage() === "en"
          ? "Tops, lace blouses and everyday pieces that are easy to mix."
          : "Áo kiểu, áo ren và áo thun dễ mặc, dễ phối với nhiều phong cách.",
    };
  }

  return {
    title: t("footer.products"),
    desc:
      getCurrentLanguage() === "en"
        ? "Explore elegant and feminine fashion designs from Melanie Mira."
        : "Khám phá các thiết kế thời trang nữ thanh lịch, nữ tính và dễ ứng dụng.",
  };
}

function createProductItem(product) {
  let hoverImage = product.hoverImage || product.images?.[1] || product.image;

  return `
    <div class="col-lg-3 col-md-4 col-6">
      <a href="product-detail.html?id=${product.id}" class="shop-product-item">
        <div class="shop-product-image">
          <img
            class="shop-product-img-main"
            src="${product.image}"
            alt="${getProductName(product)}"
          />

          <img
            class="shop-product-img-hover"
            src="${hoverImage}"
            alt="${getProductName(product)}"
          />
        </div>

        <div class="shop-product-info">
          <h3>${getProductName(product)}</h3>
          <p>${formatMoney(product.price)}</p>
        </div>
      </a>
    </div>
  `;
}

function productMatchesSearch(product, keyword) {
  return (
    product.nameVi.toLowerCase().includes(keyword) ||
    product.nameEn.toLowerCase().includes(keyword) ||
    product.categoryVi.toLowerCase().includes(keyword) ||
    product.categoryEn.toLowerCase().includes(keyword)
  );
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
      return productMatchesSearch(product, keyword);
    });
  }

  let pageInfo = getCategoryTitle(categorySlug);

  if (searchKeyword) {
    pageInfo = {
      title:
        getCurrentLanguage() === "en" ? "Search results" : "Kết quả tìm kiếm",
      desc:
        getCurrentLanguage() === "en"
          ? 'Products matching "' + searchKeyword + '".'
          : 'Sản phẩm phù hợp với từ khóa "' + searchKeyword + '".',
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
