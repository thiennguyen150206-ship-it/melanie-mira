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
   Fabric popup
   ========================= */

let fabricData = {
  lua: {
    title: "Lụa",
    image: "assets/img/fabrics/lua-detail.jpg",
    desc: "Chất vải có độ bóng nhẹ và đứng form, phù hợp cho các thiết kế sang trọng, cao cấp, đi tiệc.",
    details: [
      "Nhẹ, thoáng mát",
      "Độ rủ tự nhiên, tôn dáng",
      "Bề mặt trơn, mịn",
      "Ít nhăn, dễ giặt ủi",
    ],
  },
  linen: {
    title: "Linen",
    image: "assets/img/fabrics/linen-detail.jpg",
    desc: "Chất vải thoáng nhẹ, phù hợp với phong cách thanh lịch, tự nhiên và mặc hằng ngày.",
    details: [
      "Thoáng khí, dễ chịu",
      "Bề mặt vải tự nhiên",
      "Phù hợp thời tiết nóng",
      "Mang cảm giác nhẹ nhàng",
    ],
  },
  cotton: {
    title: "Cotton",
    image: "assets/img/fabrics/cotton-detail.jpg",
    desc: "Chất liệu mềm mại, co giãn và dễ mặc, phù hợp cho các thiết kế cơ bản hằng ngày.",
    details: [
      "Mềm, thấm hút tốt",
      "Dễ phối đồ",
      "Thoải mái khi mặc lâu",
      "Phù hợp nhiều dáng người",
    ],
  },
  denim: {
    title: "Denim",
    image: "assets/img/fabrics/denim-detail.jpg",
    desc: "Chất vải cá tính, chắc form, phù hợp với phong cách năng động và hiện đại.",
    details: [
      "Dày dặn, bền",
      "Giữ form tốt",
      "Dễ phối với áo hoặc phụ kiện",
      "Phù hợp mặc đi chơi",
    ],
  },
  ren: {
    title: "Ren",
    image: "assets/img/fabrics/ren-detail.jpg",
    desc: "Chất liệu nữ tính, tạo điểm nhấn mềm mại và quyến rũ cho các thiết kế váy áo.",
    details: [
      "Họa tiết tinh tế",
      "Tạo cảm giác nhẹ nhàng",
      "Phù hợp thiết kế nữ tính",
      "Dễ tạo điểm nhấn trang phục",
    ],
  },
  mix: {
    title: "Mix",
    image: "assets/img/fabrics/mix-detail.jpg",
    desc: "Sự kết hợp nhiều chất liệu giúp trang phục có form dáng đẹp và phù hợp nhiều hoàn cảnh.",
    details: [
      "Linh hoạt trong thiết kế",
      "Tạo form tốt hơn",
      "Phù hợp nhiều phong cách",
      "Dễ ứng dụng hằng ngày",
    ],
  },
};

function showFabricPopup(fabricKey) {
  let fabric = fabricData[fabricKey];

  if (!fabric) {
    return;
  }

  let html = "";

  for (let i = 0; i < fabric.details.length; i++) {
    html += `<li>${fabric.details[i]}</li>`;
  }

  $("#fabricPopupImage").attr("src", fabric.image);
  $("#fabricPopupImage").attr("alt", fabric.title);
  $("#fabricPopupTitle").text(fabric.title);
  $("#fabricPopupDesc").text(fabric.desc);
  $("#fabricPopupList").html(html);

  $("#fabricPopup").addClass("active");
}

function closeFabricPopup() {
  $("#fabricPopup").removeClass("active");
}
/* =========================
   Hero banner slider
   ========================= */

let currentHeroIndex = 0;
let heroTimer = null;
let heroIsResetting = false;

function updateHeroSlider(useTransition) {
  if (useTransition) {
    $("#heroTrack").css("transition", "transform 0.75s ease");
  } else {
    $("#heroTrack").css("transition", "none");
  }

  $("#heroTrack").css(
    "transform",
    "translateX(-" + currentHeroIndex * 100 + "%)",
  );
}

function goToNextHeroSlide() {
  if (heroIsResetting) {
    return;
  }

  let slides = $(".hero-slide");
  let total = slides.length;

  if (total === 0) {
    return;
  }

  currentHeroIndex++;
  updateHeroSlider(true);

  /*
    Nếu đang ở slide clone cuối cùng,
    sau khi trượt xong thì nhảy âm thầm về slide thật đầu tiên.
  */
  if (currentHeroIndex === total - 1) {
    heroIsResetting = true;

    setTimeout(function () {
      currentHeroIndex = 0;
      updateHeroSlider(false);

      /*
        Ép trình duyệt nhận trạng thái không transition trước,
        rồi bật lại transition cho lần trượt tiếp theo.
      */
      setTimeout(function () {
        $("#heroTrack").css("transition", "transform 0.75s ease");
        heroIsResetting = false;
      }, 50);
    }, 760);
  }
}

function startHeroSlider() {
  stopHeroSlider();

  heroTimer = setInterval(function () {
    goToNextHeroSlide();
  }, 3500);
}

function stopHeroSlider() {
  clearInterval(heroTimer);
}

function initHeroSlider() {
  updateHeroSlider(false);
  startHeroSlider();

  $(".hero-slider").mouseenter(function () {
    stopHeroSlider();
  });

  $(".hero-slider").mouseleave(function () {
    startHeroSlider();
  });
}
/* =========================
   Document ready
   ========================= */
$(document).ready(function () {
  initHeroSlider();
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
  /* Fabric popup */
  $(".fabric-card").click(function () {
    let fabricKey = $(this).data("fabric");
    showFabricPopup(fabricKey);
  });

  $("#btnCloseFabric").click(function () {
    closeFabricPopup();
  });

  $("#fabricPopup").click(function (e) {
    if ($(e.target).is("#fabricPopup")) {
      closeFabricPopup();
    }
  });

  /* Best seller slider */
  initBestSellerSlider();

  /* Category carousel */
  initCategoryCarousel();
});
