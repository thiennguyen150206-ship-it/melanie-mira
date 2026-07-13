const authTranslations = {
  en: {
    pageTitle: "Log in - Melanie Mira",
    title: "Log in",
    subtitle: "Use your Google account to continue",
    googleLabel: "Log in with Google",
    receiveNews:
      "I agree to receive information and promotions from Melanie Mira via Email.",
    privacyText: "Privacy Policy",
    googleFailed: "Google login failed: ",
  },

  vi: {
    pageTitle: "Đăng nhập - Melanie Mira",
    title: "Đăng nhập",
    subtitle: "Sử dụng tài khoản Google để tiếp tục",
    googleLabel: "Đăng nhập bằng Google",
    receiveNews:
      "Tôi đồng ý nhận thông tin và khuyến mãi từ Melanie Mira qua Email.",
    privacyText: "Chính sách bảo mật",
    googleFailed: "Đăng nhập Google thất bại: ",
  },
};

function getCurrentAuthLanguage() {
  const savedLanguage = localStorage.getItem("language");

  if (savedLanguage === "vi") {
    return "vi";
  }

  return "en";
}

function applyAuthLanguage() {
  const currentLanguage = getCurrentAuthLanguage();
  const text = authTranslations[currentLanguage];

  document.documentElement.lang = currentLanguage;
  document.title = text.pageTitle;

  $("body").removeClass("lang-vi lang-en");
  $("body").addClass("lang-" + currentLanguage);
  $("body").addClass("auth-page-body");

  $("#authTitle").text(text.title);
  $("#authSubtitle").text(text.subtitle);
  $("#btnGoogleLogin").attr("aria-label", text.googleLabel);
  $("#authReceiveNewsText").text(text.receiveNews);
  $("#authPrivacyText").text(text.privacyText);
}
function saveGoogleLoginResult() {
  const params = new URLSearchParams(window.location.search);

  const isGoogleLoginSuccess = params.get("google_login") === "success";
  const token = params.get("token");
  const name = params.get("name");
  const email = params.get("email");
  const error = params.get("error");
  const marketingOptIn = Number(params.get("marketing_opt_in") || 0);

  if (error) {
    const currentLanguage = getCurrentAuthLanguage();
    const text = authTranslations[currentLanguage];

    alert(text.googleFailed + error);
    return;
  }

  if (!isGoogleLoginSuccess || !token) {
    return;
  }

  const user = {
    full_name: name,
    email: email,
    role: "customer",
    marketing_opt_in: marketingOptIn,
  };

  localStorage.setItem("customerToken", token);
  localStorage.setItem("customerUser", JSON.stringify(user));

  /*
    Xóa token khỏi URL để đỡ lộ trên thanh địa chỉ.
  */
  window.history.replaceState({}, document.title, "login.html");

  window.location.href = "index.html";
}

$(document).ready(function () {
  applyAuthLanguage();
  saveGoogleLoginResult();

  $("#btnGoogleLogin").click(function () {
    const marketingOptIn = $("#authReceiveNews").is(":checked") ? 1 : 0;

    window.location.href =
      API_BASE_URL + "/auth/google?marketing_opt_in=" + marketingOptIn;
  });
});
