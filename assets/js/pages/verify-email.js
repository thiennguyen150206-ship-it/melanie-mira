function getVerifyEmailFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("email");
}

function getOtpCode() {
  let code = "";

  $(".otp-input").each(function () {
    code += $(this).val().trim();
  });

  return code;
}

function initOtpInputs() {
  $(".otp-input").on("input", function () {
    let value = $(this).val();

    value = value.replace(/\D/g, "");
    $(this).val(value);

    if (value !== "") {
      $(this).next(".otp-input").focus();
    }
  });

  $(".otp-input").on("keydown", function (e) {
    if (e.key === "Backspace" && $(this).val() === "") {
      $(this).prev(".otp-input").focus();
    }
  });

  $(".otp-input").on("paste", function (e) {
    e.preventDefault();

    const pastedText = e.originalEvent.clipboardData.getData("text");
    const numbers = pastedText.replace(/\D/g, "").slice(0, 6);

    $(".otp-input").each(function (index) {
      $(this).val(numbers[index] || "");
    });

    $(".otp-input")
      .eq(numbers.length >= 6 ? 5 : numbers.length)
      .focus();
  });
}

async function verifyEmailCode(email, code) {
  const response = await fetch(API_BASE_URL + "/auth/email/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      code: code,
    }),
  });

  return response.json();
}

async function resendEmailCode(email) {
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

function saveCustomerLogin(data) {
  localStorage.setItem("customerToken", data.token);
  localStorage.setItem("customerUser", JSON.stringify(data.user));
}

function initVerifyEmailPage() {
  const email = getVerifyEmailFromUrl();

  if (!email) {
    window.location.href = "login.html";
    return;
  }

  $("#verifyEmailText").text(email);
  $(".otp-input").first().focus();

  $("#verifyEmailForm").submit(async function (e) {
    e.preventDefault();

    $("#errVerifyCode").text("");

    const code = getOtpCode();

    if (code.length !== 6) {
      $("#errVerifyCode").text("Vui lòng nhập đủ 6 số.");
      return;
    }

    try {
      const result = await verifyEmailCode(email, code);

      if (!result.success) {
        $("#errVerifyCode").text(result.message || "Mã xác minh không đúng.");
        return;
      }

      saveCustomerLogin(result.data);

      alert("Đăng nhập thành công!");

      /*
        Tạm thời về trang chủ.
        Sau này có profile.html thì đổi thành:
        window.location.href = "profile.html";
      */
      window.location.href = "profile.html";
    } catch (error) {
      $("#errVerifyCode").text("Không thể kết nối server.");
    }
  });

  $("#btnResendCode").click(async function () {
    $("#errVerifyCode").text("");

    try {
      const result = await resendEmailCode(email);

      if (!result.success) {
        $("#errVerifyCode").text(result.message || "Không thể gửi lại mã.");
        return;
      }

      /*
        dev_code chỉ dùng local test.
        Sau này gửi email thật thì xóa đoạn console này.
      */
      console.log("Mã OTP mới:", result.data.dev_code);

      alert("Đã gửi lại mã. Kiểm tra mã trong terminal backend.");
    } catch (error) {
      $("#errVerifyCode").text("Không thể kết nối server.");
    }
  });
}

$(document).ready(function () {
  initOtpInputs();
  initVerifyEmailPage();
});
