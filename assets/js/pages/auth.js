function saveGoogleLoginResult() {
  const params = new URLSearchParams(window.location.search);

  const isGoogleLoginSuccess = params.get("google_login") === "success";
  const token = params.get("token");
  const name = params.get("name");
  const email = params.get("email");
  const error = params.get("error");

  if (error) {
    alert("Đăng nhập Google thất bại: " + error);
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

  window.location.href = "index.html";
}

$(document).ready(function () {
  saveGoogleLoginResult();

  $("#btnGoogleLogin").click(function () {
    window.location.href = API_BASE_URL + "/auth/google";
  });
});
