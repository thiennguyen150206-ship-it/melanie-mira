/* =========================
   HOME PAGE - MELANIE MIRA
   ========================= */

/* Format money */
function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

/* =========================
   Search product
   ========================= */

function getSearchKeyword() {
  return $("#searchInput").val().trim();
}

function searchProduct() {
  let keyword = getSearchKeyword();

  if (keyword === "") {
    return;
  }

  window.location.href = "products.html?search=" + encodeURIComponent(keyword);
}

function showSearchSuggest() {
  let keyword = getSearchKeyword().toLowerCase();

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
        <div class="suggest-item" data-id="${result[i].id}">
          <img src="${result[i].image}" alt="${result[i].name}" />

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

/* =========================
   Best seller slider
   ========================= */

let currentBestSellerIndex = 0;
let bestSellerRealTotal = 0;
let bestSellerTimer = null;

function prepareBestSellerSlider() {
  let track = $(".best-seller-track");
  let slides = $(".best-seller-slide");

  if (track.length === 0 || slides.length === 0) {
    return;
  }

  if (track.attr("data-cloned") === "true") {
    return;
  }

  bestSellerRealTotal = slides.length;

  let firstSlide = slides.eq(0).clone();
  firstSlide.addClass("is-clone");

  track.append(firstSlide);
  track.attr("data-cloned", "true");
}

function updateBestSellerSlider(useTransition) {
  let track = $(".best-seller-track");

  if (track.length === 0) {
    return;
  }

  if (useTransition) {
    track.css("transition", "transform 0.75s ease");
  } else {
    track.css("transition", "none");
  }

  track.css("transform", "translateX(-" + currentBestSellerIndex * 100 + "%)");
}

function goToNextBestSeller() {
  if (bestSellerRealTotal === 0) {
    return;
  }

  currentBestSellerIndex++;
  updateBestSellerSlider(true);

  if (currentBestSellerIndex === bestSellerRealTotal) {
    setTimeout(function () {
      currentBestSellerIndex = 0;
      updateBestSellerSlider(false);

      setTimeout(function () {
        $(".best-seller-track").css("transition", "transform 0.75s ease");
      }, 30);
    }, 760);
  }
}

function startBestSellerAutoSlide() {
  clearInterval(bestSellerTimer);

  bestSellerTimer = setInterval(function () {
    goToNextBestSeller();
  }, 3500);
}

function initBestSellerSlider() {
  prepareBestSellerSlider();
  updateBestSellerSlider(false);
  startBestSellerAutoSlide();
}

/* =========================
   Product category carousel
   ========================= */

let currentCategoryIndex = 0;
let categoryCarouselTimer = null;

function updateCategoryCarousel() {
  let cards = $(".category-carousel-card");
  let total = cards.length;

  if (total === 0) {
    return;
  }

  cards.removeClass("is-active is-left is-right");

  let leftIndex = (currentCategoryIndex - 1 + total) % total;
  let rightIndex = (currentCategoryIndex + 1) % total;

  cards.eq(currentCategoryIndex).addClass("is-active");
  cards.eq(leftIndex).addClass("is-left");
  cards.eq(rightIndex).addClass("is-right");
}

function goToNextCategory() {
  let cards = $(".category-carousel-card");
  let total = cards.length;

  if (total === 0) {
    return;
  }

  currentCategoryIndex = (currentCategoryIndex + 1) % total;
  updateCategoryCarousel();
}

function startCategoryAutoSlide() {
  clearInterval(categoryCarouselTimer);

  categoryCarouselTimer = setInterval(function () {
    goToNextCategory();
  }, 3500);
}

function initCategoryCarousel() {
  let isMobile = window.innerWidth <= 768;

  if (isMobile) {
    return;
  }

  updateCategoryCarousel();
  startCategoryAutoSlide();
}

/* =========================
   Document ready
   ========================= */

$(document).ready(function () {
  /* Search input */
  $("#searchInput").keyup(function (e) {
    showSearchSuggest();

    if (e.key === "Enter") {
      e.preventDefault();
      searchProduct();
      $("#searchSuggest").hide();
    }
  });

  /* Search button */
  $("#btnSearch").click(function () {
    searchProduct();
    $("#searchSuggest").hide();
  });

  /* Click search suggestion */
  $(document).on("click", ".suggest-item", function () {
    let productId = $(this).data("id");
    window.location.href = "product-detail.html?id=" + productId;
  });

  /* Close search suggest when clicking outside */
  $(document).click(function (e) {
    if (!$(e.target).closest(".header-search").length) {
      $(".search-box-dropdown").removeClass("active");
      $("#searchSuggest").hide();
    }
  });

  /* Best seller slider */
  initBestSellerSlider();

  /* Category carousel */
  initCategoryCarousel();
});
