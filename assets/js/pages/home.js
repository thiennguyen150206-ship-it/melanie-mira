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
        <div class="suggest-item" data-id="${result[i].id}">
          <img src="${result[i].image}" alt="${getProductName(result[i])}" />

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

let currentCategoryIndex = 1;
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

function goToPrevCategory() {
  let cards = $(".category-carousel-card");
  let total = cards.length;

  if (total === 0) {
    return;
  }

  currentCategoryIndex = (currentCategoryIndex - 1 + total) % total;
  updateCategoryCarousel();
}

function startCategoryAutoSlide() {
  stopCategoryAutoSlide();

  categoryCarouselTimer = setInterval(function () {
    goToNextCategory();
  }, 3500);
}

function stopCategoryAutoSlide() {
  clearInterval(categoryCarouselTimer);
}

function initCategoryCarouselSwipe() {
  let startX = 0;
  let endX = 0;

  $(".category-carousel").on("touchstart", function (e) {
    startX = e.originalEvent.touches[0].clientX;
  });

  $(".category-carousel").on("touchmove", function (e) {
    endX = e.originalEvent.touches[0].clientX;
  });

  $(".category-carousel").on("touchend", function () {
    let distance = endX - startX;

    if (Math.abs(distance) < 50) {
      return;
    }

    if (distance < 0) {
      goToNextCategory();
    } else {
      goToPrevCategory();
    }

    startX = 0;
    endX = 0;
  });
}

function initCategoryCarousel() {
  updateCategoryCarousel();

  if (window.innerWidth > 768) {
    startCategoryAutoSlide();

    $(".category-carousel").mouseenter(function () {
      stopCategoryAutoSlide();
    });

    $(".category-carousel").mouseleave(function () {
      startCategoryAutoSlide();
    });
  } else {
    stopCategoryAutoSlide();
    initCategoryCarouselSwipe();
  }
}
/* =========================
   Fabric popup
   ========================= */

let fabricData = {
  lua: {
    title: "Lụa",
    image: "assets/img/fabrics/lua.jpg",
    desc: "Chất vải có độ bóng nhẹ và đứng form, phù hợp cho các thiết kế sang trọng, cao cấp, đi tiệc.",
    details: [
      "Nhẹ, thoáng mát",
      "Độ rủ tự nhiên, tôn dáng",
      "Bề mặt trơn, mịn",
      "Ít nhăn, dễ giặt ủi",
    ],
  },
  tafta: {
    title: "Tafta",
    image: "assets/img/fabrics/tafta.jpg",
    desc: "Chất vải có độ đứng form, bề mặt hơi bóng nhẹ, thường dùng cho các thiết kế váy đầm sang trọng và nổi bật.",
    details: [
      "Đứng form, tạo dáng tốt",
      "Bề mặt vải có độ bóng nhẹ",
      "Phù hợp váy dự tiệc, đầm xòe",
      "Tạo cảm giác thanh lịch và cao cấp",
    ],
  },
  cotton: {
    title: "Cotton",
    image: "assets/img/fabrics/cotton.jpg",
    desc: "Chất liệu mềm mại, co giãn và dễ mặc, phù hợp cho các thiết kế cơ bản hằng ngày.",
    details: [
      "Mềm, thấm hút tốt",
      "Dễ phối đồ",
      "Thoải mái khi mặc lâu",
      "Phù hợp nhiều dáng người",
    ],
  },

  ren: {
    title: "Ren",
    image: "assets/img/fabrics/ren.jpg",
    desc: "Chất liệu nữ tính, tạo điểm nhấn mềm mại và quyến rũ cho các thiết kế váy áo.",
    details: [
      "Họa tiết tinh tế",
      "Tạo cảm giác nhẹ nhàng",
      "Phù hợp thiết kế nữ tính",
      "Dễ tạo điểm nhấn trang phục",
    ],
  },
};

function showFabricPopup(fabricKey) {
  let fabric = fabricData[fabricKey];

  if (!fabric) {
    return;
  }

  let title = fabric.title;
  let desc = fabric.desc;
  let details = fabric.details;

  if (getCurrentLanguage() === "en") {
    if (fabricKey === "lua") {
      title = "Silk";
      desc =
        "A soft and slightly glossy fabric, suitable for elegant and premium designs.";
      details = [
        "Light and breathable",
        "Natural drape",
        "Smooth surface",
        "Easy to style",
      ];
    }

    if (fabricKey === "tafta") {
      title = "Tafta";
      desc =
        "A structured fabric with a slight sheen, often used for elegant dresses.";
      details = [
        "Structured shape",
        "Slightly glossy surface",
        "Suitable for party dresses",
        "Elegant and premium look",
      ];
    }

    if (fabricKey === "cotton") {
      title = "Cotton";
      desc = "A soft, comfortable and easy-to-wear fabric for daily outfits.";
      details = [
        "Soft and breathable",
        "Easy to mix",
        "Comfortable for daily wear",
        "Suitable for many body types",
      ];
    }

    if (fabricKey === "ren") {
      title = "Lace";
      desc = "A feminine fabric that adds softness and charm to the outfit.";
      details = [
        "Delicate patterns",
        "Soft feminine look",
        "Suitable for elegant designs",
        "Creates outfit highlights",
      ];
    }
  }

  let html = "";

  for (let i = 0; i < details.length; i++) {
    html += `<li>${details[i]}</li>`;
  }

  $("#fabricPopupImage").attr("src", fabric.image);
  $("#fabricPopupImage").attr("alt", title);
  $("#fabricPopupTitle").text(title);
  $("#fabricPopupDesc").text(desc);
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
    total gồm:
    Banner 1, Banner 2, Banner 3, Banner 1 clone

    Khi chạy tới Banner 1 clone,
    JS sẽ nhảy âm thầm về Banner 1 thật.
  */
  if (currentHeroIndex === total - 1) {
    heroIsResetting = true;

    setTimeout(function () {
      currentHeroIndex = 0;
      updateHeroSlider(false);

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
