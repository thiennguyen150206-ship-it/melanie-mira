let allAdminCoupons = [];
let couponFormMode = "create";
let editingCouponId = null;
let couponSearchTimer = null;
let isLoadingCoupons = false;
let isSavingCoupon = false;
let isUpdatingCouponStatus = false;

function formatAdminCouponMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function escapeAdminCouponHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeAdminCouponCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function formatAdminCouponDate(dateValue) {
  if (!dateValue) {
    return "Không giới hạn";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Không rõ";
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCouponInputDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return year + "-" + month + "-" + day + "T" + hour + ":" + minute;
}

function getAdminCouponToken() {
  if (typeof getValidAdminToken === "function") {
    return getValidAdminToken();
  }

  const token = localStorage.getItem("adminToken");

  if (!token) {
    throw new Error("Vui lòng đăng nhập admin trước.");
  }

  return token;
}

function handleAdminCouponAuthError(response) {
  if (response.status === 401 || response.status === 403) {
    if (typeof handleAdminSessionExpired === "function") {
      handleAdminSessionExpired();
    }

    throw new Error("Phiên admin đã hết hạn. Vui lòng đăng nhập lại.");
  }
}

function showCouponAdminMessage(message, type) {
  $("#couponAdminMessage")
    .removeClass("text-danger text-success text-muted")
    .text("");

  if (!message) {
    return;
  }

  if (type === "success") {
    $("#couponAdminMessage").addClass("text-success");
  } else if (type === "error") {
    $("#couponAdminMessage").addClass("text-danger");
  } else {
    $("#couponAdminMessage").addClass("text-muted");
  }

  $("#couponAdminMessage").text(message);
}

async function fetchAdminCoupons() {
  const adminToken = await getAdminCouponToken();

  const response = await fetch(API_BASE_URL + "/coupons/admin", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + adminToken,
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminCouponAuthError(response);
    throw new Error(result.message || "Không thể tải mã giảm giá.");
  }

  return result.data || [];
}

async function createAdminCoupon(data) {
  const adminToken = await getAdminCouponToken();

  const response = await fetch(API_BASE_URL + "/coupons/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + adminToken,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminCouponAuthError(response);
    throw new Error(result.message || "Không thể tạo mã giảm giá.");
  }

  return result.data;
}

async function updateAdminCoupon(couponId, data) {
  const adminToken = await getAdminCouponToken();

  const response = await fetch(API_BASE_URL + "/coupons/admin/" + couponId, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + adminToken,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminCouponAuthError(response);
    throw new Error(result.message || "Không thể cập nhật mã giảm giá.");
  }

  return result.data;
}

async function updateAdminCouponStatus(couponId, isActive) {
  const adminToken = await getAdminCouponToken();

  const response = await fetch(
    API_BASE_URL + "/coupons/admin/" + couponId + "/status",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + adminToken,
      },
      body: JSON.stringify({
        is_active: Number(isActive),
      }),
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminCouponAuthError(response);
    throw new Error(result.message || "Không thể cập nhật trạng thái mã.");
  }

  return result.data;
}

function getCouponDiscountText(coupon) {
  const discountType = coupon.discount_type;
  const discountValue = Number(coupon.discount_value || 0);

  if (discountType === "percent") {
    let text = discountValue + "%";

    if (coupon.max_discount_amount !== null) {
      text +=
        "<br /><span class='coupon-small-text'>Tối đa: " +
        formatAdminCouponMoney(coupon.max_discount_amount) +
        "</span>";
    }

    return text;
  }

  return formatAdminCouponMoney(discountValue);
}

function getCouponUsageText(coupon) {
  const usedCount = Number(coupon.used_count || 0);

  if (coupon.usage_limit === null || coupon.usage_limit === undefined) {
    return usedCount + " / Không giới hạn";
  }

  return usedCount + " / " + Number(coupon.usage_limit);
}

function getFilteredAdminCoupons() {
  const keyword = $("#couponSearchInput").val().trim().toLowerCase();
  const statusFilter = $("#couponStatusFilter").val();

  return allAdminCoupons.filter(function (coupon) {
    const searchText = [
      coupon.id,
      coupon.code,
      coupon.name,
      coupon.discount_type,
    ]
      .join(" ")
      .toLowerCase();

    const matchKeyword = searchText.includes(keyword);

    let matchStatus = true;

    if (statusFilter === "active") {
      matchStatus = Number(coupon.is_active) === 1;
    }

    if (statusFilter === "inactive") {
      matchStatus = Number(coupon.is_active) === 0;
    }

    return matchKeyword && matchStatus;
  });
}

function renderAdminCoupons() {
  const coupons = getFilteredAdminCoupons();

  if (coupons.length === 0) {
    $("#adminCouponsTableBody").html(`
      <tr>
        <td colspan="8" class="text-center">Không có mã giảm giá phù hợp</td>
      </tr>
    `);

    return;
  }

  let html = "";

  for (let i = 0; i < coupons.length; i++) {
    const coupon = coupons[i];
    const couponId = Number(coupon.id);
    const isActive = Number(coupon.is_active) === 1;

    const statusClass = isActive
      ? "coupon-status-active"
      : "coupon-status-inactive";

    const statusText = isActive ? "Đang bật" : "Đang tắt";
    const toggleText = isActive ? "Tắt" : "Bật";
    const nextStatus = isActive ? 0 : 1;

    html += `
      <tr>
        <td>${couponId}</td>

        <td>
          <div class="coupon-code-text">
            ${escapeAdminCouponHtml(coupon.code)}
          </div>

          <div class="coupon-small-text">
            ${escapeAdminCouponHtml(coupon.name || "Không có tên")}
          </div>
        </td>

        <td>${getCouponDiscountText(coupon)}</td>

        <td>${formatAdminCouponMoney(coupon.min_order_amount || 0)}</td>

        <td>${escapeAdminCouponHtml(getCouponUsageText(coupon))}</td>

        <td>
          <div class="coupon-small-text">
            Bắt đầu: ${formatAdminCouponDate(coupon.starts_at)}
          </div>

          <div class="coupon-small-text">
            Hết hạn: ${formatAdminCouponDate(coupon.expires_at)}
          </div>
        </td>

        <td>
          <span class="coupon-status-badge ${statusClass}">
            ${statusText}
          </span>
        </td>

        <td>
          <div class="coupon-action-row">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm btn-edit-coupon"
              data-id="${couponId}"
            >
              Sửa
            </button>

            <button
              type="button"
              class="btn btn-outline-danger btn-sm btn-toggle-coupon-status"
              data-id="${couponId}"
              data-active="${nextStatus}"
            >
              ${toggleText}
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  $("#adminCouponsTableBody").html(html);
}

async function loadAdminCoupons() {
  if (isLoadingCoupons) {
    return;
  }

  isLoadingCoupons = true;
  $("#btnLoadCoupons").prop("disabled", true);
  showCouponAdminMessage("Đang tải mã giảm giá...", "normal");

  try {
    allAdminCoupons = await fetchAdminCoupons();

    renderAdminCoupons();

    showCouponAdminMessage("Đã tải mã giảm giá.", "success");
  } catch (error) {
    showCouponAdminMessage(error.message, "error");
  } finally {
    isLoadingCoupons = false;
    $("#btnLoadCoupons").prop("disabled", false);
  }
}

function clearCouponFormErrors() {
  $("#errCouponCode").text("");
  $("#errCouponDiscountValue").text("");
}

function resetCouponForm() {
  $("#couponForm")[0].reset();

  couponFormMode = "create";
  editingCouponId = null;

  $("#editingCouponId").val("");
  $("#couponDiscountType").val("percent");
  $("#couponIsActive").val("1");
  $("#couponMinOrderAmount").val(0);

  $("#couponFormTitle").text("Thêm mã giảm giá");
  $("#btnSaveCoupon").text("Lưu mã giảm giá");

  clearCouponFormErrors();
}

function openCouponModal() {
  resetCouponForm();
  $("#couponModalOverlay").addClass("active");
}

function closeCouponModal() {
  $("#couponModalOverlay").removeClass("active");
  resetCouponForm();
}

function findAdminCouponById(couponId) {
  for (let i = 0; i < allAdminCoupons.length; i++) {
    if (Number(allAdminCoupons[i].id) === Number(couponId)) {
      return allAdminCoupons[i];
    }
  }

  return null;
}

function openEditCouponModal(couponId) {
  const coupon = findAdminCouponById(couponId);

  if (!coupon) {
    showCouponAdminMessage("Không tìm thấy mã giảm giá cần sửa.", "error");
    return;
  }

  couponFormMode = "edit";
  editingCouponId = Number(couponId);

  clearCouponFormErrors();

  $("#editingCouponId").val(couponId);
  $("#couponFormTitle").text("Sửa mã giảm giá #" + couponId);
  $("#btnSaveCoupon").text("Cập nhật mã");

  $("#couponCode").val(coupon.code || "");
  $("#couponName").val(coupon.name || "");
  $("#couponDiscountType").val(coupon.discount_type || "percent");
  $("#couponDiscountValue").val(Number(coupon.discount_value || 0));

  $("#couponMaxDiscountAmount").val(
    coupon.max_discount_amount === null ||
      coupon.max_discount_amount === undefined
      ? ""
      : Number(coupon.max_discount_amount),
  );

  $("#couponMinOrderAmount").val(Number(coupon.min_order_amount || 0));

  $("#couponUsageLimit").val(
    coupon.usage_limit === null || coupon.usage_limit === undefined
      ? ""
      : Number(coupon.usage_limit),
  );

  $("#couponIsActive").val(Number(coupon.is_active));
  $("#couponStartsAt").val(formatCouponInputDate(coupon.starts_at));
  $("#couponExpiresAt").val(formatCouponInputDate(coupon.expires_at));

  $("#couponModalOverlay").addClass("active");
}

function getCouponFormData() {
  return {
    code: normalizeAdminCouponCode($("#couponCode").val()),
    name: $("#couponName").val().trim(),
    discount_type: $("#couponDiscountType").val(),
    discount_value: Number($("#couponDiscountValue").val()),
    max_discount_amount: $("#couponMaxDiscountAmount").val().trim(),
    min_order_amount: $("#couponMinOrderAmount").val().trim(),
    usage_limit: $("#couponUsageLimit").val().trim(),
    starts_at: $("#couponStartsAt").val(),
    expires_at: $("#couponExpiresAt").val(),
    is_active: Number($("#couponIsActive").val()),
  };
}

function validateCouponForm(data) {
  let isValid = true;

  clearCouponFormErrors();

  if (!/^[A-Z0-9_-]{2,50}$/.test(data.code)) {
    $("#errCouponCode").text(
      "Mã chỉ dùng chữ in hoa, số, dấu gạch dưới hoặc gạch ngang.",
    );
    isValid = false;
  }

  if (
    Number.isNaN(data.discount_value) ||
    data.discount_value <= 0 ||
    data.discount_value > 999999999
  ) {
    $("#errCouponDiscountValue").text("Giá trị giảm không hợp lệ.");
    isValid = false;
  }

  if (data.discount_type === "percent" && data.discount_value > 100) {
    $("#errCouponDiscountValue").text("Giảm theo % không được vượt quá 100%.");
    isValid = false;
  }

  return isValid;
}

async function submitCouponForm() {
  if (isSavingCoupon) {
    return;
  }

  const data = getCouponFormData();

  if (!validateCouponForm(data)) {
    return;
  }

  isSavingCoupon = true;

  const isEditMode = couponFormMode === "edit" && editingCouponId;

  $("#btnSaveCoupon")
    .prop("disabled", true)
    .text(isEditMode ? "Đang cập nhật..." : "Đang lưu...");

  showCouponAdminMessage("", "");

  try {
    if (isEditMode) {
      await updateAdminCoupon(editingCouponId, data);
    } else {
      await createAdminCoupon(data);
    }

    closeCouponModal();

    await loadAdminCoupons();

    showCouponAdminMessage(
      isEditMode ? "Đã cập nhật mã giảm giá." : "Đã tạo mã giảm giá mới.",
      "success",
    );
  } catch (error) {
    showCouponAdminMessage(error.message, "error");
  } finally {
    isSavingCoupon = false;

    $("#btnSaveCoupon")
      .prop("disabled", false)
      .text(isEditMode ? "Cập nhật mã" : "Lưu mã giảm giá");
  }
}

async function toggleCouponStatus(couponId, nextStatus) {
  if (isUpdatingCouponStatus) {
    return;
  }

  const confirmMessage =
    Number(nextStatus) === 1
      ? "Bạn có chắc muốn bật mã giảm giá này không?"
      : "Bạn có chắc muốn tắt mã giảm giá này không?";

  if (!confirm(confirmMessage)) {
    return;
  }

  isUpdatingCouponStatus = true;

  showCouponAdminMessage("Đang cập nhật trạng thái mã...", "normal");

  try {
    await updateAdminCouponStatus(couponId, Number(nextStatus));

    for (let i = 0; i < allAdminCoupons.length; i++) {
      if (Number(allAdminCoupons[i].id) === Number(couponId)) {
        allAdminCoupons[i].is_active = Number(nextStatus);
        break;
      }
    }

    renderAdminCoupons();

    showCouponAdminMessage("Đã cập nhật trạng thái mã giảm giá.", "success");
  } catch (error) {
    showCouponAdminMessage(error.message, "error");
  } finally {
    isUpdatingCouponStatus = false;
  }
}

function resetAdminCouponSection() {
  clearTimeout(couponSearchTimer);

  allAdminCoupons = [];

  $("#couponSearchInput").val("");
  $("#couponStatusFilter").val("all");

  $("#adminCouponsTableBody").html(`
    <tr>
      <td colspan="8" class="text-center">Chưa tải mã giảm giá</td>
    </tr>
  `);

  showCouponAdminMessage("", "");
}

function initAdminCouponEvents() {
  $("#btnLoadCoupons").click(function () {
    loadAdminCoupons();
  });

  $("#btnOpenCouponModal").click(function () {
    openCouponModal();
  });

  $("#btnCloseCouponModal").click(function () {
    closeCouponModal();
  });

  $("#btnCancelCouponForm").click(function () {
    closeCouponModal();
  });

  $("#couponModalOverlay").click(function (event) {
    if (event.target === this) {
      closeCouponModal();
    }
  });

  $("#couponForm").submit(function (event) {
    event.preventDefault();
    submitCouponForm();
  });

  $("#couponCode").on("input", function () {
    $(this).val(normalizeAdminCouponCode($(this).val()));
  });

  $("#couponSearchInput").on("input", function () {
    clearTimeout(couponSearchTimer);

    couponSearchTimer = setTimeout(function () {
      renderAdminCoupons();
    }, 300);
  });

  $("#couponStatusFilter").change(function () {
    renderAdminCoupons();
  });

  $("#btnClearCouponFilter").click(function () {
    $("#couponSearchInput").val("");
    $("#couponStatusFilter").val("all");

    renderAdminCoupons();
  });

  $(document).on("click", ".btn-edit-coupon", function () {
    const couponId = $(this).data("id");

    openEditCouponModal(couponId);
  });

  $(document).on("click", ".btn-toggle-coupon-status", function () {
    const couponId = $(this).data("id");
    const nextStatus = $(this).data("active");

    toggleCouponStatus(couponId, nextStatus);
  });

  $("#btnAdminLogout").click(function () {
    resetAdminCouponSection();
  });
}

$(document).ready(function () {
  initAdminCouponEvents();

  if (getAdminToken()) {
    loadAdminCoupons();
  }
});
