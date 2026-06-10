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

/* =========================
   Language
   ========================= */

function getCurrentLanguage() {
  return localStorage.getItem("language") || "vi";
}

function setCurrentLanguage(language) {
  localStorage.setItem("language", language);
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

    "home.bestSeller": "Best Seller",
    "home.categoryTitle": "Danh mục sản phẩm",
    "home.fabricTitle": "Đa dạng chất liệu & mẫu mã",
    "home.policyTitle": "Chính sách đổi trả sản phẩm",

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
    "footer.policy": "Chính sách",
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
  },

  en: {
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

    "home.bestSeller": "Best Seller",
    "home.categoryTitle": "Product Categories",
    "home.fabricTitle": "Fabrics & Styles",
    "home.policyTitle": "Return & Exchange Policy",

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

    "product.detail": "Product Details",
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
    "footer.policy": "Policy",
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
  },
};

function applyStaticLanguage() {
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

$(document).ready(function () {
  updateCartCount();
  applyStaticLanguage();

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
