const authTranslations = {
  en: {
    pageTitle: "Log in or create an account - Melanie Mira",
    title: "Log in",
    subtitle: "Log in or create an account",
    googleLabel: "Log in with Google",
    orText: "or",
    emailPlaceholder: "Email",
    receiveNews:
      "I agree to receive information and promotions from Melanie Mira via Email/Zalo.",
    noteText: "By continuing, you agree to the",
    termsText: "Terms of Service",
    privacyText: "Privacy Policy",
    emptyEmail: "Please enter your email.",
    invalidEmail: "Invalid email address.",
    cannotSendCode: "Cannot send verification code.",
    cannotConnectServer: "Cannot connect to server.",
    googleFailed: "Google login failed: ",
  },

  vi: {
    pageTitle: "Đăng nhập hoặc tạo tài khoản - Melanie Mira",
    title: "Đăng nhập",
    subtitle: "Đăng nhập hoặc tạo tài khoản",
    googleLabel: "Đăng nhập bằng Google",
    orText: "hoặc",
    emailPlaceholder: "Email",
    receiveNews:
      "Tôi đồng ý nhận thông tin và khuyến mãi từ Melanie Mira qua Email/Zalo.",
    noteText: "Bằng cách tiếp tục, bạn đồng ý với",
    termsText: "Điều khoản dịch vụ",
    privacyText: "Chính sách bảo mật",
    emptyEmail: "Vui lòng nhập email.",
    invalidEmail: "Email không hợp lệ.",
    cannotSendCode: "Không thể gửi mã xác minh.",
    cannotConnectServer: "Không thể kết nối server.",
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
  $("#authOrText").text(text.orText);
  $("#authEmail").attr("placeholder", text.emailPlaceholder);
  $("#authReceiveNewsText").text(text.receiveNews);
  $("#authNoteText").text(text.noteText);
  $("#authTermsText").text(text.termsText);
  $("#authPrivacyText").text(text.privacyText);
}
function saveGoogleLoginResult() {
  const params = new URLSearchParams(window.location.search);

  const isGoogleLoginSuccess = params.get("google_login") === "success";
  const token = params.get("token");
  const name = params.get("name");
  const email = params.get("email");
  const error = params.get("error");

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
  };

  localStorage.setItem("customerToken", token);
  localStorage.setItem("customerUser", JSON.stringify(user));

  /*
    Xóa token khỏi URL để đỡ lộ trên thanh địa chỉ.
  */
  window.history.replaceState({}, document.title, "login.html");

  window.location.href = "profile.html";
}

$(document).ready(function () {
  applyAuthLanguage();
  saveGoogleLoginResult();

  $("#btnGoogleLogin").click(function () {
    window.location.href = API_BASE_URL + "/auth/google";
  });

  initEmailOtpLogin();
});
async function startEmailLogin(email) {
  const response = await fetch(API_BASE_URL + "/auth/email/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
    }),
  });

  return response.json();
}

function initEmailOtpLogin() {
  $("#authForm").submit(async function (e) {
    e.preventDefault();

    const currentLanguage = getCurrentAuthLanguage();
    const text = authTranslations[currentLanguage];

    const email = $("#authEmail").val().trim();

    $("#errAuthEmail").text("");

    if (email === "") {
      $("#errAuthEmail").text(text.emptyEmail);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $("#errAuthEmail").text(text.invalidEmail);
      return;
    }

    try {
      const result = await startEmailLogin(email);

      if (!result.success) {
        $("#errAuthEmail").text(result.message || text.cannotSendCode);
        return;
      }

      /*
        dev_code chỉ dùng local test.
        Sau này gửi email thật thì xóa dòng console này.
      */
      console.log("Mã OTP:", result.data.dev_code);

      window.location.href =
        "verify-email.html?email=" + encodeURIComponent(email);
    } catch (error) {
      $("#errAuthEmail").text(text.cannotConnectServer);
    }
  });
}
