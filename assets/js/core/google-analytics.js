/* =========================
   Google Analytics 4
   Chỉ hoạt động sau khi khách đồng ý theo dõi
   ========================= */

(function () {
  "use strict";

  const config = window.MELANIE_MIRA_CONFIG || {};

  const GA4_MEASUREMENT_ID = String(config.GA4_MEASUREMENT_ID || "").trim();

  const GA4_DISABLE_KEY = "ga-disable-" + GA4_MEASUREMENT_ID;

  let googleAnalyticsInitialized = false;
  let googleAnalyticsPageViewSent = false;
  let googleAnalyticsTrackingAllowed = false;

  function isGoogleAnalyticsEnabled() {
    return config.GA4_ENABLED !== false;
  }

  function isProductionGoogleAnalyticsHost() {
    return (
      window.location.hostname === "melaniemira.com.vn" ||
      window.location.hostname === "www.melaniemira.com.vn"
    );
  }

  function isLocalGoogleAnalyticsHost() {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  function isGoogleAnalyticsHostAllowed() {
    if (isProductionGoogleAnalyticsHost()) {
      return true;
    }

    return config.GA4_ALLOW_LOCAL === true && isLocalGoogleAnalyticsHost();
  }

  function isGoogleAnalyticsConsentAccepted() {
    return Boolean(
      window.MelanieTrackingConsent &&
      typeof window.MelanieTrackingConsent.isAccepted === "function" &&
      window.MelanieTrackingConsent.isAccepted(),
    );
  }

  function createGoogleTagApi() {
    window.dataLayer = window.dataLayer || [];

    if (typeof window.gtag !== "function") {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }
  }

  function setGoogleAnalyticsDisabled(disabled) {
    if (GA4_MEASUREMENT_ID === "") {
      return;
    }

    window[GA4_DISABLE_KEY] = disabled === true;
  }

  function setDefaultGoogleConsent() {
    if (typeof window.gtag !== "function") {
      return;
    }

    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });
  }

  function grantGoogleAnalyticsConsent() {
    if (typeof window.gtag !== "function") {
      return;
    }

    /*
      Chỉ cấp quyền đo lường Analytics.
      Chưa cấp quyền quảng cáo hoặc cá nhân hóa quảng cáo.
    */
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }

  function denyGoogleAnalyticsConsent() {
    if (typeof window.gtag !== "function") {
      return;
    }

    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }

  function loadGoogleTagScript() {
    if (document.querySelector('script[data-melanie-ga4="true"]')) {
      return;
    }

    const scriptElement = document.createElement("script");

    scriptElement.async = true;
    scriptElement.dataset.melanieGa4 = "true";

    scriptElement.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(GA4_MEASUREMENT_ID);

    document.head.appendChild(scriptElement);
  }

  function sendGoogleAnalyticsPageView() {
    if (
      !googleAnalyticsTrackingAllowed ||
      !googleAnalyticsInitialized ||
      googleAnalyticsPageViewSent ||
      typeof window.gtag !== "function"
    ) {
      return false;
    }

    try {
      window.gtag("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.search,
      });

      googleAnalyticsPageViewSent = true;

      return true;
    } catch (error) {
      console.log("Cannot send GA4 page_view:", error);

      return false;
    }
  }

  function initializeGoogleAnalytics() {
    if (
      !isGoogleAnalyticsEnabled() ||
      GA4_MEASUREMENT_ID === "" ||
      !isGoogleAnalyticsHostAllowed() ||
      !isGoogleAnalyticsConsentAccepted()
    ) {
      return false;
    }

    googleAnalyticsTrackingAllowed = true;

    /*
      Bỏ trạng thái tắt GA4 nếu khách
      chuyển từ Từ chối sang Đồng ý.
    */
    setGoogleAnalyticsDisabled(false);

    createGoogleTagApi();

    if (googleAnalyticsInitialized) {
      grantGoogleAnalyticsConsent();
      sendGoogleAnalyticsPageView();

      return true;
    }

    try {
      /*
        Đặt mặc định từ chối trước,
        sau đó chỉ cấp analytics_storage
        khi khách đã đồng ý theo dõi.
      */
      setDefaultGoogleConsent();
      grantGoogleAnalyticsConsent();

      window.gtag("js", new Date());

      window.gtag("config", GA4_MEASUREMENT_ID, {
        /*
            Tự gửi page_view ở hàm riêng
            để tránh gửi hai lần.
          */
        send_page_view: false,

        /*
            Hiện chỉ dùng để phân tích website,
            chưa bật tính năng quảng cáo Google.
          */
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });

      loadGoogleTagScript();

      googleAnalyticsInitialized = true;

      sendGoogleAnalyticsPageView();

      return true;
    } catch (error) {
      console.log("Cannot initialize Google Analytics:", error);

      return false;
    }
  }

  function revokeGoogleAnalyticsTracking() {
    googleAnalyticsTrackingAllowed = false;

    /*
      Thuộc tính ga-disable ngăn Google tag
      tiếp tục gửi dữ liệu sau khi khách từ chối.
    */
    setGoogleAnalyticsDisabled(true);

    if (googleAnalyticsInitialized && typeof window.gtag === "function") {
      denyGoogleAnalyticsConsent();
    }
  }

  function trackGoogleAnalyticsEvent(eventName, parameters) {
    if (
      !googleAnalyticsTrackingAllowed ||
      !googleAnalyticsInitialized ||
      !isGoogleAnalyticsConsentAccepted() ||
      typeof window.gtag !== "function"
    ) {
      return false;
    }

    const safeEventName = String(eventName || "").trim();

    /*
      Tên sự kiện GA4:
      bắt đầu bằng chữ và tối đa 40 ký tự.
    */
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(safeEventName)) {
      return false;
    }

    try {
      window.gtag("event", safeEventName, parameters || {});

      return true;
    } catch (error) {
      console.log("Cannot send GA4 event " + safeEventName + ":", error);

      return false;
    }
  }

  function getGoogleAnalyticsStatus() {
    return {
      measurementId: GA4_MEASUREMENT_ID,
      enabled: isGoogleAnalyticsEnabled(),
      hostAllowed: isGoogleAnalyticsHostAllowed(),
      consentAccepted: isGoogleAnalyticsConsentAccepted(),
      initialized: googleAnalyticsInitialized,
      trackingAllowed: googleAnalyticsTrackingAllowed,
      pageViewSent: googleAnalyticsPageViewSent,
      disabled:
        GA4_MEASUREMENT_ID !== "" ? window[GA4_DISABLE_KEY] === true : false,
    };
  }

  function handleTrackingConsentChanged(event) {
    const detail = event.detail || {};

    if (detail.allowed === true) {
      initializeGoogleAnalytics();
      return;
    }

    revokeGoogleAnalyticsTracking();
  }

  document.addEventListener(
    "melanie:tracking-consent-changed",
    handleTrackingConsentChanged,
  );

  /*
    Cho các file trang sử dụng nếu sau này
    cần thêm sự kiện GA4 riêng.
  */
  window.MelanieGoogleAnalytics = {
    init: initializeGoogleAnalytics,
    trackEvent: trackGoogleAnalyticsEvent,
    getStatus: getGoogleAnalyticsStatus,

    isInitialized: function () {
      return googleAnalyticsInitialized;
    },

    isTrackingAllowed: function () {
      return (
        googleAnalyticsTrackingAllowed && isGoogleAnalyticsConsentAccepted()
      );
    },
  };

  /*
    tracking-consent.js được tải trước,
    nên đọc được lựa chọn đã lưu của khách.
  */
  initializeGoogleAnalytics();
})();
