/* =========================
   Tracking consent
   Lưu lựa chọn theo dõi của khách hàng
   ========================= */

(function () {
  "use strict";

  const TRACKING_CONSENT_STORAGE_KEY = "melanieTrackingConsent";

  const TRACKING_CONSENT_ACCEPTED = "accepted";
  const TRACKING_CONSENT_REJECTED = "rejected";

  let trackingConsentMemoryValue = null;

  function getTrackingConsentLanguage() {
    try {
      return localStorage.getItem("language") === "en" ? "en" : "vi";
    } catch (error) {
      return "vi";
    }
  }

  function getTrackingConsentText() {
    const language = getTrackingConsentLanguage();

    if (language === "en") {
      return {
        title: "Your privacy choices",
        description:
          "Melanie Mira uses optional tracking technologies to measure website performance and improve advertising. You can accept or reject these technologies without affecting your shopping experience.",
        privacy: "Privacy Policy",
        accept: "Accept",
        reject: "Reject",
        settings: "Tracking preferences",
      };
    }

    return {
      title: "Lựa chọn quyền riêng tư của bạn",
      description:
        "Melanie Mira sử dụng công nghệ theo dõi không thiết yếu để đo lường hiệu quả website và cải thiện quảng cáo. Bạn có thể đồng ý hoặc từ chối mà không ảnh hưởng đến việc mua sắm.",
      privacy: "Chính sách quyền riêng tư",
      accept: "Đồng ý",
      reject: "Từ chối",
      settings: "Tùy chọn theo dõi",
    };
  }

  function isValidTrackingConsent(value) {
    return (
      value === TRACKING_CONSENT_ACCEPTED || value === TRACKING_CONSENT_REJECTED
    );
  }

  function readTrackingConsent() {
    try {
      const storedValue = localStorage.getItem(TRACKING_CONSENT_STORAGE_KEY);

      if (isValidTrackingConsent(storedValue)) {
        return storedValue;
      }
    } catch (error) {
      console.log("Cannot read tracking consent:", error);
    }

    return isValidTrackingConsent(trackingConsentMemoryValue)
      ? trackingConsentMemoryValue
      : null;
  }

  function saveTrackingConsent(value) {
    trackingConsentMemoryValue = value;

    try {
      localStorage.setItem(TRACKING_CONSENT_STORAGE_KEY, value);
    } catch (error) {
      console.log("Cannot save tracking consent:", error);
    }
  }

  function createTrackingConsentBanner() {
    if (document.getElementById("trackingConsentBanner")) {
      return;
    }

    const text = getTrackingConsentText();

    const banner = document.createElement("div");

    banner.id = "trackingConsentBanner";
    banner.className = "tracking-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "trackingConsentTitle");
    banner.setAttribute("aria-hidden", "true");

    banner.innerHTML = `
      <div class="tracking-consent-card">
        <div class="tracking-consent-content">
          <h2
            class="tracking-consent-title"
            id="trackingConsentTitle"
          >
            ${text.title}
          </h2>

          <p class="tracking-consent-description">
            ${text.description}

            <a href="privacy.html">
              ${text.privacy}
            </a>
          </p>
        </div>

        <div class="tracking-consent-actions">
          <button
            type="button"
            class="tracking-consent-btn tracking-consent-btn-reject"
            id="btnRejectTracking"
          >
            ${text.reject}
          </button>

          <button
            type="button"
            class="tracking-consent-btn tracking-consent-btn-accept"
            id="btnAcceptTracking"
          >
            ${text.accept}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
  }

  function createTrackingSettingsButton() {
    if (document.getElementById("btnTrackingSettings")) {
      return;
    }

    const footerLinks = document.querySelector(".footer-links");

    if (!footerLinks) {
      return;
    }

    const text = getTrackingConsentText();

    const button = document.createElement("button");

    button.type = "button";
    button.id = "btnTrackingSettings";
    button.className = "footer-main-link tracking-settings-link";

    button.textContent = text.settings;

    footerLinks.appendChild(button);
  }

  function openTrackingConsentBanner() {
    createTrackingConsentBanner();

    const banner = document.getElementById("trackingConsentBanner");

    if (!banner) {
      return;
    }

    banner.classList.add("is-visible");
    banner.setAttribute("aria-hidden", "false");
  }

  function closeTrackingConsentBanner() {
    const banner = document.getElementById("trackingConsentBanner");

    if (!banner) {
      return;
    }

    banner.classList.remove("is-visible");
    banner.setAttribute("aria-hidden", "true");
  }

  function dispatchTrackingConsentChanged(value) {
    document.dispatchEvent(
      new CustomEvent("melanie:tracking-consent-changed", {
        detail: {
          status: value,
          allowed: value === TRACKING_CONSENT_ACCEPTED,
        },
      }),
    );
  }

  function setTrackingConsent(value) {
    if (!isValidTrackingConsent(value)) {
      return;
    }

    saveTrackingConsent(value);
    closeTrackingConsentBanner();
    dispatchTrackingConsentChanged(value);
  }

  function acceptTrackingConsent() {
    setTrackingConsent(TRACKING_CONSENT_ACCEPTED);
  }

  function rejectTrackingConsent() {
    setTrackingConsent(TRACKING_CONSENT_REJECTED);
  }

  function initTrackingConsentEvents() {
    document.addEventListener("click", function (event) {
      const acceptButton = event.target.closest("#btnAcceptTracking");

      if (acceptButton) {
        acceptTrackingConsent();
        return;
      }

      const rejectButton = event.target.closest("#btnRejectTracking");

      if (rejectButton) {
        rejectTrackingConsent();
        return;
      }

      const settingsButton = event.target.closest("#btnTrackingSettings");

      if (settingsButton) {
        openTrackingConsentBanner();
      }
    });
  }

  function initTrackingConsent() {
    createTrackingConsentBanner();
    createTrackingSettingsButton();
    initTrackingConsentEvents();

    if (!readTrackingConsent()) {
      openTrackingConsentBanner();
    }
  }

  /*
    Cho meta-pixel.js và google-analytics.js sử dụng sau này.
  */
  window.MelanieTrackingConsent = {
    get: readTrackingConsent,

    isAccepted: function () {
      return readTrackingConsent() === TRACKING_CONSENT_ACCEPTED;
    },

    isRejected: function () {
      return readTrackingConsent() === TRACKING_CONSENT_REJECTED;
    },

    open: openTrackingConsentBanner,
    accept: acceptTrackingConsent,
    reject: rejectTrackingConsent,

    storageKey: TRACKING_CONSENT_STORAGE_KEY,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTrackingConsent);
  } else {
    initTrackingConsent();
  }
})();
