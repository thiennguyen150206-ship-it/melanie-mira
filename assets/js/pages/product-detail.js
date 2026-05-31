let currentProduct = null;
let selectedSize = "";

function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

function getProductIdFromUrl() {
  let params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function createProductImages(product) {
  if (product.images && product.images.length > 0) {
    return product.images;
  }

  return [product.image];
}

function renderProductImages(product) {
  let images = createProductImages(product);
  let html = "";

  for (let i = 0; i < images.length; i++) {
    html += `
      <div class="product-detail-image-item">
        <img src="${images[i]}" alt="${product.name}" />
      </div>
    `;
  }

  $("#productDetailGallery").html(html);
}

function renderProductInfo(product) {
  $("#detailName").text(product.name);
  $("#detailPrice").text(formatMoney(product.price));

  $("#detailInfoList").html(`
    <li>${product.description}</li>
    <li>Danh mục: ${product.category}</li>
    <li>Thiết kế phù hợp với phong cách nữ tính và thanh lịch.</li>
    <li>Dễ phối với nhiều phụ kiện và hoàn cảnh sử dụng.</li>
  `);
}
function renderRecommendProducts(product) {
  let maxRecommend = 4;

  /* Ưu tiên lấy sản phẩm cùng nhóm */
  let sameCategoryProducts = products.filter(function (item) {
    return item.id !== product.id && item.categorySlug === product.categorySlug;
  });

  let suggestProducts = [];

  /* Nếu cùng nhóm có sản phẩm thì lấy trước */
  for (let i = 0; i < sameCategoryProducts.length; i++) {
    if (suggestProducts.length < maxRecommend) {
      suggestProducts.push(sameCategoryProducts[i]);
    }
  }

  /* Nếu chưa đủ thì lấy thêm sản phẩm nhóm khác */
  if (suggestProducts.length < maxRecommend) {
    let otherProducts = products.filter(function (item) {
      return (
        item.id !== product.id && item.categorySlug !== product.categorySlug
      );
    });

    for (let i = 0; i < otherProducts.length; i++) {
      if (suggestProducts.length < maxRecommend) {
        suggestProducts.push(otherProducts[i]);
      }
    }
  }

  let html = "";

  for (let i = 0; i < suggestProducts.length; i++) {
    html += `
      <a href="product-detail.html?id=${suggestProducts[i].id}" class="recommend-item">
        <img src="${suggestProducts[i].image}" alt="${suggestProducts[i].name}" />
        <h4>${suggestProducts[i].name}</h4>
        <p>${formatMoney(suggestProducts[i].price)}</p>
      </a>
    `;
  }

  $("#recommendProducts").html(html);
}

function renderProductDetail() {
  let productId = getProductIdFromUrl();

  currentProduct = products.find(function (product) {
    return product.id === productId;
  });

  if (!currentProduct) {
    $(".product-detail-page").html(`
      <div class="container py-5 text-center">
        <h2>Không tìm thấy sản phẩm</h2>
        <p>Sản phẩm này có thể đã bị xóa hoặc chưa được cập nhật.</p>
        <a href="products.html" class="btn-main">Quay lại sản phẩm</a>
      </div>
    `);
    return;
  }

  renderProductImages(currentProduct);
  renderProductInfo(currentProduct);
  renderRecommendProducts(currentProduct);
}

function addProductToCart() {
  if (!currentProduct) {
    return;
  }

  if (selectedSize === "") {
    $("#sizeMessage").text("Bạn cần chọn size trước khi thêm vào giỏ.");
    return;
  }

  let cart = getCart();

  let index = cart.findIndex(function (item) {
    return item.id === currentProduct.id && item.size === selectedSize;
  });

  if (index !== -1) {
    cart[index].quantity += 1;
  } else {
    cart.push({
      id: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.price,
      image: currentProduct.image,
      size: selectedSize,
      quantity: 1,
    });
  }

  saveCart(cart);

  if (typeof updateCartCount === "function") {
    updateCartCount();
  }

  $("#sizeMessage").text("Đã thêm size " + selectedSize + " vào giỏ hàng.");
}

$(document).ready(function () {
  renderProductDetail();

  $(".size-option").click(function () {
    $(".size-option").removeClass("active");
    $(this).addClass("active");

    selectedSize = $(this).data("size");
    $("#sizeMessage").text("Bạn đã chọn size " + selectedSize + ".");
  });

  $("#btnAddToCartDetail").click(function () {
    addProductToCart();
  });

  $("#btnBuyNow").click(function () {
    addProductToCart();

    if (selectedSize !== "") {
      window.location.href = "cart.html";
    }
  });

  $("#btnToggleDetail").click(function () {
    if (window.innerWidth > 768) {
      return;
    }

    $(".product-detail-accordion").toggleClass("active");

    if ($(".product-detail-accordion").hasClass("active")) {
      $(".detail-toggle-icon").text("-");
    } else {
      $(".detail-toggle-icon").text("+");
    }
  });
});
