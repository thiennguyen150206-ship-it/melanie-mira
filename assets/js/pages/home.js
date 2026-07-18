/* =========================
   HOME PAGE - MELANIE MIRA
   ========================= */

/* Format money */
function formatMoney(price) {
  return price.toLocaleString("vi-VN") + "đ";
}

/* =========================
   Slider controls
   Tạo nút trái/phải + 3 dots cho Hero và Best Seller
   ========================= */

function getHomeSliderControlHtml(type) {
  return `
    <div class="slider-control ${type}-slider-control">
      <button type="button" class="slider-arrow ${type}-prev" aria-label="Banner trước">
        ‹
      </button>

      <div class="slider-dots">
        <button type="button" class="slider-dot ${type}-dot active" data-index="0"></button>
        <button type="button" class="slider-dot ${type}-dot" data-index="1"></button>
        <button type="button" class="slider-dot ${type}-dot" data-index="2"></button>
      </div>

      <button type="button" class="slider-arrow ${type}-next" aria-label="Banner sau">
        ›
      </button>
    </div>
  `;
}

function addHeroControls() {
  if ($(".hero-content .hero-slider-control").length === 0) {
    $(".hero-content").append(getHomeSliderControlHtml("hero"));
  }
}

function addBestSellerControls() {
  /*
    Đưa controls ra ngoài phần chữ Best Seller.
    Nhờ vậy dots và mũi tên có thể nằm sát cạnh dưới banner giống Hero.
  */
  if ($(".best-seller-slider .best-seller-slider-control").length === 0) {
    $(".best-seller-slider").append(getHomeSliderControlHtml("best-seller"));
  }
}
/* =========================
   Best seller slider
   ========================= */

let currentBestSellerIndex = 0;
let bestSellerRealTotal = 0;
let bestSellerTimer = null;
let bestSellerIsResetting = false;

function prepareBestSellerSlider() {
  let track = $(".best-seller-track");
  let slides = $(".best-seller-slide").not(".is-clone");

  if (track.length === 0 || slides.length === 0) {
    return;
  }

  bestSellerRealTotal = slides.length;

  /* 
    Clone slide đầu để khi auto chạy tới cuối,
    slider nhảy về đầu nhìn mượt hơn.
  */
  if (track.attr("data-cloned") === "true") {
    return;
  }

  let firstSlide = slides.eq(0).clone();
  firstSlide.addClass("is-clone");

  track.append(firstSlide);
  track.attr("data-cloned", "true");
}

function updateBestSellerDots() {
  if (bestSellerRealTotal === 0) {
    return;
  }

  let activeIndex = currentBestSellerIndex % bestSellerRealTotal;

  $(".best-seller-dot").removeClass("active");
  $('.best-seller-dot[data-index="' + activeIndex + '"]').addClass("active");
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

  updateBestSellerDots();
}

function goToNextBestSeller() {
  if (bestSellerRealTotal === 0 || bestSellerIsResetting) {
    return;
  }

  currentBestSellerIndex++;
  updateBestSellerSlider(true);

  /*
    Khi chạy tới slide clone,
    reset âm thầm về slide thật đầu tiên.
  */
  if (currentBestSellerIndex === bestSellerRealTotal) {
    bestSellerIsResetting = true;

    setTimeout(function () {
      currentBestSellerIndex = 0;
      updateBestSellerSlider(false);

      setTimeout(function () {
        $(".best-seller-track").css("transition", "transform 0.75s ease");
        bestSellerIsResetting = false;
      }, 40);
    }, 760);
  }
}

function goToPrevBestSeller() {
  if (bestSellerRealTotal === 0 || bestSellerIsResetting) {
    return;
  }

  currentBestSellerIndex--;

  if (currentBestSellerIndex < 0) {
    currentBestSellerIndex = bestSellerRealTotal - 1;
  }

  updateBestSellerSlider(true);
}

function goToBestSellerSlide(index) {
  if (bestSellerRealTotal === 0 || bestSellerIsResetting) {
    return;
  }

  currentBestSellerIndex = index;
  updateBestSellerSlider(true);
}

function startBestSellerAutoSlide() {
  clearInterval(bestSellerTimer);

  bestSellerTimer = setInterval(function () {
    goToNextBestSeller();
  }, 3500);
}

function initBestSellerSwipe() {
  let startX = 0;
  let endX = 0;

  $(".best-seller-slider").off("touchstart.bestSellerSwipe");
  $(".best-seller-slider").off("touchmove.bestSellerSwipe");
  $(".best-seller-slider").off("touchend.bestSellerSwipe");

  $(".best-seller-slider").on("touchstart.bestSellerSwipe", function (e) {
    startX = e.originalEvent.touches[0].clientX;
    endX = startX;
  });

  $(".best-seller-slider").on("touchmove.bestSellerSwipe", function (e) {
    endX = e.originalEvent.touches[0].clientX;
  });

  $(".best-seller-slider").on("touchend.bestSellerSwipe", function () {
    let distance = endX - startX;

    if (Math.abs(distance) < 50) {
      return;
    }

    if (distance < 0) {
      goToNextBestSeller();
    } else {
      goToPrevBestSeller();
    }

    startBestSellerAutoSlide();

    startX = 0;
    endX = 0;
  });
}

function bindBestSellerControls() {
  $(document).off("click", ".best-seller-next");
  $(document).off("click", ".best-seller-prev");
  $(document).off("click", ".best-seller-dot");

  $(document).on("click", ".best-seller-next", function (e) {
    e.preventDefault();
    e.stopPropagation();

    goToNextBestSeller();
    startBestSellerAutoSlide();
  });

  $(document).on("click", ".best-seller-prev", function (e) {
    e.preventDefault();
    e.stopPropagation();

    goToPrevBestSeller();
    startBestSellerAutoSlide();
  });

  $(document).on("click", ".best-seller-dot", function (e) {
    e.preventDefault();
    e.stopPropagation();

    let index = Number($(this).data("index"));

    goToBestSellerSlide(index);
    startBestSellerAutoSlide();
  });
}

function initBestSellerSlider() {
  prepareBestSellerSlider();

  /*
    Sau khi clone xong mới thêm control,
    để slide clone cũng có nút và dots.
  */
  addBestSellerControls();

  updateBestSellerSlider(false);
  startBestSellerAutoSlide();
  bindBestSellerControls();
  initBestSellerSwipe();
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
let heroRealTotal = 0;

function updateHeroDots() {
  if (heroRealTotal === 0) {
    return;
  }

  let activeIndex = currentHeroIndex % heroRealTotal;

  $(".hero-dot").removeClass("active");
  $('.hero-dot[data-index="' + activeIndex + '"]').addClass("active");
}

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

  updateHeroDots();
}

function goToNextHeroSlide() {
  if (heroRealTotal === 0 || heroIsResetting) {
    return;
  }

  currentHeroIndex++;
  updateHeroSlider(true);

  /*
    index 0,1,2 là 3 banner thật.
    index 3 là banner clone.
    Khi tới clone thì reset về banner 0.
  */
  if (currentHeroIndex === heroRealTotal) {
    heroIsResetting = true;

    setTimeout(function () {
      currentHeroIndex = 0;
      updateHeroSlider(false);

      setTimeout(function () {
        $("#heroTrack").css("transition", "transform 0.75s ease");
        heroIsResetting = false;
      }, 40);
    }, 760);
  }
}

function goToPrevHeroSlide() {
  if (heroRealTotal === 0 || heroIsResetting) {
    return;
  }

  currentHeroIndex--;

  if (currentHeroIndex < 0) {
    currentHeroIndex = heroRealTotal - 1;
  }

  updateHeroSlider(true);
}

function goToHeroSlide(index) {
  if (heroRealTotal === 0 || heroIsResetting) {
    return;
  }

  currentHeroIndex = index;
  updateHeroSlider(true);
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

function initHeroSwipe() {
  let startX = 0;
  let endX = 0;

  $(".hero-slider").off("touchstart.heroSwipe");
  $(".hero-slider").off("touchmove.heroSwipe");
  $(".hero-slider").off("touchend.heroSwipe");

  $(".hero-slider").on("touchstart.heroSwipe", function (e) {
    startX = e.originalEvent.touches[0].clientX;
    endX = startX;
  });

  $(".hero-slider").on("touchmove.heroSwipe", function (e) {
    endX = e.originalEvent.touches[0].clientX;
  });

  $(".hero-slider").on("touchend.heroSwipe", function () {
    let distance = endX - startX;

    if (Math.abs(distance) < 50) {
      return;
    }

    if (distance < 0) {
      goToNextHeroSlide();
    } else {
      goToPrevHeroSlide();
    }

    startHeroSlider();

    startX = 0;
    endX = 0;
  });
}

function bindHeroControls() {
  $(document).off("click", ".hero-next");
  $(document).off("click", ".hero-prev");
  $(document).off("click", ".hero-dot");

  $(document).on("click", ".hero-next", function (e) {
    e.preventDefault();

    goToNextHeroSlide();
    startHeroSlider();
  });

  $(document).on("click", ".hero-prev", function (e) {
    e.preventDefault();

    goToPrevHeroSlide();
    startHeroSlider();
  });

  $(document).on("click", ".hero-dot", function (e) {
    e.preventDefault();

    let index = Number($(this).data("index"));

    goToHeroSlide(index);
    startHeroSlider();
  });
}

function initHeroSlider() {
  addHeroControls();

  /*
    Chỉ đếm banner thật, không đếm banner clone.
  */
  heroRealTotal = $(".hero-slide").not(".hero-slide-clone").length;

  updateHeroSlider(false);
  startHeroSlider();
  bindHeroControls();
  initHeroSwipe();

  /*
    Desktop: rê chuột vào thì tạm dừng,
    rời chuột thì chạy tiếp.
  */
  $(".hero-slider").mouseenter(function () {
    stopHeroSlider();
  });

  $(".hero-slider").mouseleave(function () {
    startHeroSlider();
  });
}
/* =========================
   Home video autoplay
   Hỗ trợ video tự chạy trên mobile
   ========================= */

function initHomeVideoAutoplay() {
  let homeVideo = document.querySelector(".home-video");

  if (!homeVideo) {
    return;
  }

  /*
    Cấu hình video như banner thời trang:
    - Tự chạy
    - Tắt tiếng
    - Lặp lại
    - Không controls
    - Không picture-in-picture
  */
  homeVideo.muted = true;
  homeVideo.defaultMuted = true;
  homeVideo.loop = true;
  homeVideo.autoplay = true;
  homeVideo.playsInline = true;
  homeVideo.controls = false;

  homeVideo.setAttribute("muted", "");
  homeVideo.setAttribute("loop", "");
  homeVideo.setAttribute("autoplay", "");
  homeVideo.setAttribute("playsinline", "");
  homeVideo.setAttribute("webkit-playsinline", "");
  homeVideo.removeAttribute("controls");

  if ("disablePictureInPicture" in homeVideo) {
    homeVideo.disablePictureInPicture = true;
  }

  if ("disableRemotePlayback" in homeVideo) {
    homeVideo.disableRemotePlayback = true;
  }

  function playHomeVideo() {
    let playPromise = homeVideo.play();

    if (playPromise !== undefined) {
      playPromise.catch(function () {
        /*
          Một số trình duyệt mobile có thể chặn autoplay lần đầu.
          Khi người dùng chạm/click trang, video sẽ được gọi chạy lại bên dưới.
        */
      });
    }
  }

  /*
    Khi video sẵn sàng thì tự chạy.
  */
  homeVideo.addEventListener("loadedmetadata", function () {
    playHomeVideo();
  });

  homeVideo.addEventListener("canplay", function () {
    playHomeVideo();
  });

  /*
    Backup cho loop:
    Bình thường thuộc tính loop đã đủ,
    đoạn này chỉ để chắc chắn nếu trình duyệt xử lý loop lỗi.
  */
  homeVideo.addEventListener("ended", function () {
    homeVideo.currentTime = 0;
    playHomeVideo();
  });

  /*
    Khi quay lại tab/trang, video tiếp tục chạy.
  */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      playHomeVideo();
    }
  });

  window.addEventListener("pageshow", function () {
    playHomeVideo();
  });

  /*
    Fallback mobile:
    Nếu autoplay bị chặn, sau lần chạm/click đầu tiên trên trang thì chạy lại.
    Video vẫn không có chức năng khi bấm trực tiếp vì CSS đã pointer-events: none.
  */
  document.addEventListener("touchstart", playHomeVideo, {
    once: true,
    passive: true,
  });

  document.addEventListener("click", playHomeVideo, {
    once: true,
  });

  playHomeVideo();
}

/* =========================
   Index header visibility
   Ẩn topbar/header khi cuộn tới Best Seller
   ========================= */

function updateIndexHeaderVisibility() {
  const bestSellerSection = document.querySelector(".best-seller-section");

  if (!bestSellerSection) {
    return;
  }

  const bestSellerTop = bestSellerSection.getBoundingClientRect().top;

  /*
    Khi Best Seller chạm gần đầu màn hình,
    topbar + header sẽ ẩn đi để không che nội dung.
  */
  if (bestSellerTop <= 80) {
    document.body.classList.add("index-header-hidden");
    return;
  }

  document.body.classList.remove("index-header-hidden");
}

function initIndexHeaderVisibility() {
  updateIndexHeaderVisibility();

  window.addEventListener("scroll", updateIndexHeaderVisibility, {
    passive: true,
  });

  window.addEventListener("resize", updateIndexHeaderVisibility);
}

/* =========================
   Document ready
   ========================= */
$(document).ready(function () {
  initIndexHeaderVisibility();
  initHeroSlider();
  initHomeVideoAutoplay();
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
