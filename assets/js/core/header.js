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

$(document).ready(function () {
  updateCartCount();

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

    $("#productSubMenu").toggleClass("active");
  });

  $("#btnOpenSearch").click(function (e) {
    e.preventDefault();
    e.stopPropagation();

    $(".search-box-dropdown").toggleClass("active");
    $("#searchInput").focus();
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
