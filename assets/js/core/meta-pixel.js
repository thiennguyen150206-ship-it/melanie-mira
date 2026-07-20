/* =========================
   Meta Pixel
   Chỉ hoạt động sau khi khách đồng ý theo dõi
   ========================= */

(function () {
  "use strict";

  const config = window.MELANIE_MIRA_CONFIG || {};

  const META_PIXEL_ID = String(config.META_PIXEL_ID || "").trim();

  let metaPixelInitialized = false;
  let metaPageViewSent = false;
  let metaTrackingAllowed = false;

  function isMetaPixelEnabled() {
    return config.META_PIXEL_ENABLED !== false;
  }

  function isProductionMetaHost() {
    return (
      window.location.hostname === "melaniemira.com.vn" ||
      window.location.hostname === "www.melaniemira.com.vn"
    );
  }

  function isLocalMetaHost() {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  function isMetaPixelHostAllowed() {
    if (isProductionMetaHost()) {
      return true;
    }

    return config.META_PIXEL_ALLOW_LOCAL === true && isLocalMetaHost();
  }

  function isMetaTrackingConsentAccepted() {
    return Boolean(
      window.MelanieTrackingConsent &&
      typeof window.MelanieTrackingConsent.isAccepted === "function" &&
      window.MelanieTrackingConsent.isAccepted(),
    );
  }

  function createMetaPixelBaseCode() {
    if (typeof window.fbq === "function") {
      return;
    }

    (function (windowObject, documentObject, tagName, sourceUrl) {
      let pixelFunction;
      let scriptElement;
      let firstScript;

      if (windowObject.fbq) {
        return;
      }

      pixelFunction = windowObject.fbq = function () {
        if (pixelFunction.callMethod) {
          pixelFunction.callMethod.apply(pixelFunction, arguments);
        } else {
          pixelFunction.queue.push(arguments);
        }
      };

      if (!windowObject._fbq) {
        windowObject._fbq = pixelFunction;
      }

      pixelFunction.push = pixelFunction;
      pixelFunction.loaded = true;
      pixelFunction.version = "2.0";
      pixelFunction.queue = [];

      scriptElement = documentObject.createElement(tagName);
      scriptElement.async = true;
      scriptElement.src = sourceUrl;

      firstScript = documentObject.getElementsByTagName(tagName)[0];

      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(scriptElement, firstScript);
      } else {
        documentObject.head.appendChild(scriptElement);
      }
    })(
      window,
      document,
      "script",
      "https://connect.facebook.net/en_US/fbevents.js",
    );
  }

  function sendMetaPageView() {
    if (
      !metaTrackingAllowed ||
      !metaPixelInitialized ||
      metaPageViewSent ||
      typeof window.fbq !== "function"
    ) {
      return false;
    }

    try {
      window.fbq("track", "PageView");
      metaPageViewSent = true;

      return true;
    } catch (error) {
      console.log("Cannot send Meta PageView:", error);
      return false;
    }
  }

  function initializeMetaPixel() {
    if (
      !isMetaPixelEnabled() ||
      META_PIXEL_ID === "" ||
      !isMetaPixelHostAllowed() ||
      !isMetaTrackingConsentAccepted()
    ) {
      return false;
    }

    metaTrackingAllowed = true;

    /*
      Pixel đã khởi tạo trước đó:
      cấp lại quyền khi khách đổi từ Từ chối sang Đồng ý.
    */
    if (metaPixelInitialized) {
      if (typeof window.fbq === "function") {
        window.fbq("consent", "grant");
      }

      sendMetaPageView();
      return true;
    }

    try {
      createMetaPixelBaseCode();

      window.fbq("init", META_PIXEL_ID);

      metaPixelInitialized = true;

      sendMetaPageView();

      return true;
    } catch (error) {
      console.log("Cannot initialize Meta Pixel:", error);
      return false;
    }
  }

  function revokeMetaTracking() {
    metaTrackingAllowed = false;

    /*
      Trường hợp Pixel đã được bật trong lần lựa chọn trước,
      ngừng gửi thêm sự kiện sau khi khách bấm Từ chối.
    */
    if (metaPixelInitialized && typeof window.fbq === "function") {
      try {
        window.fbq("consent", "revoke");
      } catch (error) {
        console.log("Cannot revoke Meta consent:", error);
      }
    }
  }

  function trackMetaStandardEvent(eventName, parameters) {
    if (
      !metaTrackingAllowed ||
      !metaPixelInitialized ||
      !isMetaTrackingConsentAccepted() ||
      typeof window.fbq !== "function"
    ) {
      return false;
    }

    const safeEventName = String(eventName || "").trim();

    if (safeEventName === "") {
      return false;
    }

    try {
      window.fbq("track", safeEventName, parameters || {});

      return true;
    } catch (error) {
      console.log("Cannot send Meta event " + safeEventName + ":", error);

      return false;
    }
  }

  function getMetaPixelStatus() {
    return {
      pixelId: META_PIXEL_ID,
      enabled: isMetaPixelEnabled(),
      hostAllowed: isMetaPixelHostAllowed(),
      consentAccepted: isMetaTrackingConsentAccepted(),
      initialized: metaPixelInitialized,
      trackingAllowed: metaTrackingAllowed,
      pageViewSent: metaPageViewSent,
    };
  }

  function handleTrackingConsentChanged(event) {
    const detail = event.detail || {};

    if (detail.allowed === true) {
      initializeMetaPixel();
      return;
    }

    revokeMetaTracking();
  }

  document.addEventListener(
    "melanie:tracking-consent-changed",
    handleTrackingConsentChanged,
  );

  /*
    Các file trang sản phẩm sẽ gọi trackStandard()
    trong giai đoạn tiếp theo.
  */
  window.MelanieMetaPixel = {
    init: initializeMetaPixel,
    trackStandard: trackMetaStandardEvent,
    getStatus: getMetaPixelStatus,

    isInitialized: function () {
      return metaPixelInitialized;
    },

    isTrackingAllowed: function () {
      return metaTrackingAllowed && isMetaTrackingConsentAccepted();
    },
  };

  /*
    tracking-consent.js được tải trước file này,
    nên có thể kiểm tra lựa chọn ngay khi script chạy.
  */
  initializeMetaPixel();
})();
