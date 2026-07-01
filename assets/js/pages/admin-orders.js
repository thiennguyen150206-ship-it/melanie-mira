let allOrders = [];
let allStockProducts = [];

let currentOrderPage = 1;
let totalOrderPages = 1;
let totalOrderCount = 0;

const ORDER_PAGE_LIMIT = 10;
const MAX_STOCK_PER_SIZE = 999;

let orderSearchTimer = null;
let stockSearchTimer = null;

let isLoadingOrders = false;
let isUpdatingOrderStatus = false;
let isLoadingOrderDetail = false;
let isLoadingStock = false;
let isUpdatingStock = false;

function formatAdminMoney(price) {
  return Number(price).toLocaleString("vi-VN") + "đ";
}

function formatAdminDate(dateValue) {
  if (!dateValue) {
    return "Không rõ";
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

function escapeHtml(value) {
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

function getAdminStatusText(status) {
  if (status === "pending") {
    return "Chờ xác nhận";
  }

  if (status === "confirmed") {
    return "Đã xác nhận";
  }

  if (status === "shipping") {
    return "Đang giao";
  }

  if (status === "completed") {
    return "Hoàn thành";
  }

  if (status === "cancelled") {
    return "Đã hủy";
  }

  return status;
}

function getAdminPaymentText(paymentMethod) {
  if (paymentMethod === "cod") {
    return "Thanh toán khi nhận hàng";
  }

  if (paymentMethod === "bank_transfer") {
    return "Chuyển khoản ngân hàng";
  }

  return paymentMethod || "Không rõ";
}

function getAdminStatusClass(status) {
  return (
    "status-" +
    String(status || "")
      .trim()
      .toLowerCase()
  );
}

function getAdminKey() {
  return $("#adminKeyInput").val().trim();
}

function getAdminToken() {
  return localStorage.getItem("adminToken");
}

function saveAdminToken(token) {
  localStorage.setItem("adminToken", token);
}

function clearAdminToken() {
  localStorage.removeItem("adminToken");
}

function showAdminMessage(message, type) {
  $("#adminMessage")
    .removeClass("admin-message-success admin-message-error")
    .text("");

  if (!message) {
    return;
  }

  if (type === "success") {
    $("#adminMessage").addClass("admin-message-success");
  } else {
    $("#adminMessage").addClass("admin-message-error");
  }

  $("#adminMessage").text(message);
}

function resetAdminDataView() {
  allOrders = [];
  allStockProducts = [];
  currentOrderPage = 1;

  clearOrderStats();
  renderOrderPagination(null);
  clearStockStats();

  $("#ordersTableBody").html(`
    <tr>
      <td colspan="10" class="text-center">Chưa tải đơn hàng</td>
    </tr>
  `);

  $("#stockTableBody").html(`
    <tr>
      <td colspan="7" class="text-center">Chưa tải tồn kho</td>
    </tr>
  `);

  $("#orderDetailBox").hide();
}

function handleAdminSessionExpired() {
  clearAdminToken();
  updateAdminLoginStatus();
  resetAdminDataView();

  throw new Error("Phiên admin đã hết hạn. Vui lòng nhập admin key lại.");
}

function updateAdminLoginStatus() {
  const token = getAdminToken();

  if (token) {
    $("#adminLoginStatus").text("Đã đăng nhập admin.");
    $("#adminLoginStatus").removeClass("text-muted text-danger");
    $("#adminLoginStatus").addClass("text-success");

    $("#adminKeyBox").hide();
    $("#adminLoadBox").removeClass("col-md-3").addClass("col-md-6");
    $("#adminLogoutBox").show();

    return;
  }

  $("#adminLoginStatus").text("Chưa đăng nhập admin.");
  $("#adminLoginStatus").removeClass("text-success text-danger");
  $("#adminLoginStatus").addClass("text-muted");

  $("#adminKeyBox").show();
  $("#adminLoadBox").removeClass("col-md-6").addClass("col-md-3");
  $("#adminLogoutBox").hide();
}

async function loginAdmin() {
  let adminKey = getAdminKey();

  if (adminKey === "") {
    throw new Error("Vui lòng nhập admin key.");
  }

  let response = await fetch(API_BASE_URL + "/auth/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      admin_key: adminKey,
    }),
  });

  let result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Đăng nhập admin thất bại.");
  }

  let token = result.data?.token || result.token;

  if (!token) {
    throw new Error("Backend không trả admin token.");
  }

  saveAdminToken(token);
  $("#adminKeyInput").val("");
  updateAdminLoginStatus();

  return token;
}

async function getValidAdminToken() {
  /*
    Ưu tiên dùng adminToken đã lưu.
    Chỉ login bằng admin key khi chưa có token.
  */
  let token = getAdminToken();

  if (token) {
    return token;
  }

  return await loginAdmin();
}

function getAllowedAdminStatuses(currentStatus) {
  if (currentStatus === "pending") {
    return ["pending", "confirmed", "cancelled"];
  }

  if (currentStatus === "confirmed") {
    return ["confirmed", "shipping", "cancelled"];
  }

  if (currentStatus === "shipping") {
    return ["shipping", "completed"];
  }

  if (currentStatus === "completed") {
    return ["completed"];
  }

  if (currentStatus === "cancelled") {
    return ["cancelled"];
  }

  return [currentStatus];
}

function getStatusOptions(currentStatus) {
  const statuses = getAllowedAdminStatuses(currentStatus);

  let html = "";

  for (let i = 0; i < statuses.length; i++) {
    let status = statuses[i];
    let selected = status === currentStatus ? "selected" : "";

    html += `
      <option value="${status}" ${selected}>
        ${getAdminStatusText(status)}
      </option>
    `;
  }

  return html;
}

function renderOrderStats(stats) {
  $("#statAllOrders").text(stats.total_orders || 0);
  $("#statPendingOrders").text(stats.pending_orders || 0);
  $("#statConfirmedOrders").text(stats.confirmed_orders || 0);
  $("#statShippingOrders").text(stats.shipping_orders || 0);
  $("#statCompletedOrders").text(stats.completed_orders || 0);
  $("#statCancelledOrders").text(stats.cancelled_orders || 0);

  if ($("#statValidRevenue").length) {
    $("#statValidRevenue").text(formatAdminMoney(stats.valid_revenue || 0));
  }
}

function clearOrderStats() {
  renderOrderStats({
    total_orders: 0,
    pending_orders: 0,
    confirmed_orders: 0,
    shipping_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    valid_revenue: 0,
  });
}

async function loadOrderStats() {
  try {
    const adminToken = await getValidAdminToken();

    const response = await fetch(API_BASE_URL + "/orders/stats", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + adminToken,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      if (response.status === 401 || response.status === 403) {
        handleAdminSessionExpired();
      }

      throw new Error(result.message || "Không thể tải thống kê đơn hàng.");
    }

    renderOrderStats(result.data);
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}
function updateOrderPaginationButtons() {
  $("#btnPrevOrderPage").prop(
    "disabled",
    isLoadingOrders || currentOrderPage <= 1,
  );

  $("#btnNextOrderPage").prop(
    "disabled",
    isLoadingOrders || currentOrderPage >= totalOrderPages,
  );
}

function renderOrderPagination(pagination) {
  if (!pagination) {
    totalOrderPages = 1;
    totalOrderCount = 0;

    $("#orderPaginationInfo").text("Trang 1 / 1 - Tổng 0 đơn");
    $("#btnPrevOrderPage").prop("disabled", true);
    $("#btnNextOrderPage").prop("disabled", true);
    return;
  }

  totalOrderPages = Number(pagination.total_pages) || 1;
  totalOrderCount = Number(pagination.total) || 0;

  if (totalOrderPages < 1) {
    totalOrderPages = 1;
  }

  $("#orderPaginationInfo").text(
    "Trang " +
      currentOrderPage +
      " / " +
      totalOrderPages +
      " - Tổng " +
      totalOrderCount +
      " đơn",
  );
  updateOrderPaginationButtons();
}

async function loadOrders() {
  if (isLoadingOrders) {
    return;
  }

  isLoadingOrders = true;
  $("#btnLoadOrders").prop("disabled", true);
  updateOrderPaginationButtons();
  showAdminMessage("", "");
  $("#orderDetailBox").hide();

  try {
    let adminToken = await getValidAdminToken();

    let statusFilter = $("#orderStatusFilter").val();
    let keyword = $("#orderSearchInput").val().trim();

    let params = new URLSearchParams();

    params.set("page", currentOrderPage);
    params.set("limit", ORDER_PAGE_LIMIT);

    if (statusFilter && statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    if (keyword !== "") {
      params.set("search", keyword);
    }

    let response = await fetch(API_BASE_URL + "/orders?" + params.toString(), {
      method: "GET",
      headers: {
        Authorization: "Bearer " + adminToken,
      },
    });

    let result = await response.json();

    if (!response.ok || !result.success) {
      if (response.status === 401 || response.status === 403) {
        handleAdminSessionExpired();
      }

      throw new Error(result.message || "Không thể tải đơn hàng.");
    }

    allOrders = result.data || [];

    renderOrders(allOrders);
    renderOrderPagination(result.pagination);
  } catch (error) {
    showAdminMessage(error.message, "error");
  } finally {
    isLoadingOrders = false;
    $("#btnLoadOrders").prop("disabled", false);
    updateOrderPaginationButtons();
  }
}

function renderOrders(orders) {
  let html = "";

  if (orders.length === 0) {
    $("#ordersTableBody").html(`
    <tr>
      <td colspan="10" class="text-center">Chưa có đơn hàng</td>
    </tr>
  `);
    return;
  }

  for (let i = 0; i < orders.length; i++) {
    let order = orders[i];

    /*
      Đơn đã hủy hoặc đã hoàn tất thì không cho sửa nữa.
      Lý do: backend cũng đang chặn cancelled/completed.
    */
    let orderStatus = String(order.status || "")
      .trim()
      .toLowerCase();
    let isLocked = orderStatus === "cancelled" || orderStatus === "completed";
    let disabledText = isLocked ? "disabled" : "";

    html += `
      <tr>
        <td>${order.id}</td>
         <td>${formatAdminDate(order.created_at)}</td>
<td>${escapeHtml(order.customer_name)}</td>
<td>${escapeHtml(order.customer_phone)}</td>
<td>${escapeHtml(order.customer_address)}</td>
<td>${formatAdminMoney(order.total_amount)}</td>
<td>${escapeHtml(getAdminPaymentText(order.payment_method))}</td>
<td>
  <select 
  class="form-select order-status ${getAdminStatusClass(orderStatus)}" 
  data-id="${order.id}"
  data-current-status="${orderStatus}"
  ${disabledText}
>
  ${getStatusOptions(orderStatus)}
</select>
        </td>

        <td>
         <button 
  class="btn btn-sm btn-primary btn-update-status" 
  data-id="${order.id}"
  disabled
>
  Lưu
</button>
        </td>
        <td>
  <button 
    class="btn btn-sm btn-outline-dark btn-view-order" 
    data-id="${order.id}"
  >
    Xem
  </button>
</td>
      </tr>
    `;
  }

  $("#ordersTableBody").html(html);
}

async function updateOrderStatus(orderId, status) {
  if (isUpdatingOrderStatus) {
    return;
  }

  isUpdatingOrderStatus = true;
  $('.btn-update-status[data-id="' + orderId + '"]').prop("disabled", true);
  try {
    let adminToken = await getValidAdminToken();

    let response = await fetch(
      API_BASE_URL + "/orders/" + orderId + "/status",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + adminToken,
        },
        body: JSON.stringify({
          status: status,
        }),
      },
    );

    let result = await response.json();

    if (!response.ok || !result.success) {
      if (response.status === 401 || response.status === 403) {
        handleAdminSessionExpired();
      }

      throw new Error(result.message || "Không thể cập nhật trạng thái.");
    }

    $("#orderDetailBox").hide();

    await loadOrders();
    await loadOrderStats();

    showAdminMessage(
      "Đã cập nhật trạng thái đơn #" + orderId + " thành công.",
      "success",
    );
  } catch (error) {
    showAdminMessage(error.message, "error");
  } finally {
    isUpdatingOrderStatus = false;

    const statusSelect = $('.order-status[data-id="' + orderId + '"]');
    const saveButton = $('.btn-update-status[data-id="' + orderId + '"]');

    if (statusSelect.length && saveButton.length) {
      const currentStatus = statusSelect.data("current-status");
      const newStatus = statusSelect.val();

      saveButton.prop("disabled", newStatus === currentStatus);
    }
  }
}

async function loadOrderDetail(orderId) {
  if (isLoadingOrderDetail) {
    return;
  }

  isLoadingOrderDetail = true;
  $('.btn-view-order[data-id="' + orderId + '"]').prop("disabled", true);
  showAdminMessage("", "");

  try {
    let adminToken = await getValidAdminToken();

    let response = await fetch(API_BASE_URL + "/orders/" + orderId, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + adminToken,
      },
    });

    let result = await response.json();

    if (!response.ok || !result.success) {
      if (response.status === 401 || response.status === 403) {
        handleAdminSessionExpired();
      }

      throw new Error(result.message || "Không thể tải chi tiết đơn hàng.");
    }

    renderOrderDetail(result.data);
  } catch (error) {
    showAdminMessage(error.message, "error");
  } finally {
    isLoadingOrderDetail = false;

    if ($('.btn-view-order[data-id="' + orderId + '"]').length) {
      $('.btn-view-order[data-id="' + orderId + '"]').prop("disabled", false);
    }
  }
}

function renderOrderDetail(order) {
  $("#orderDetailBox").show();

  $("#detailOrderId").text(order.id);

  $("#orderDetailInfo").html(`
  <p><strong>Ngày đặt:</strong> ${formatAdminDate(order.created_at)}</p>
  <p><strong>Khách hàng:</strong> ${escapeHtml(order.customer_name)}</p>
  <p><strong>Số điện thoại:</strong> ${escapeHtml(order.customer_phone)}</p>
  <p><strong>Địa chỉ:</strong> ${escapeHtml(order.customer_address)}</p>
  <p><strong>Ghi chú:</strong> ${escapeHtml(order.note || "Không có")}</p>
<p><strong>Trạng thái:</strong> ${escapeHtml(getAdminStatusText(order.status))}</p>
<p><strong>Thanh toán:</strong> ${escapeHtml(getAdminPaymentText(order.payment_method))}</p>
<p><strong>Tổng tiền:</strong> ${formatAdminMoney(order.total_amount)}</p>
`);

  let html = "";

  for (let i = 0; i < order.items.length; i++) {
    let item = order.items[i];

    html += `
  <tr>
    <td>${escapeHtml(item.product_name)}</td>
    <td>${escapeHtml(item.size)}</td>
    <td>${Number(item.quantity)}</td>
    <td>${formatAdminMoney(item.price)}</td>
    <td>${formatAdminMoney(item.subtotal)}</td>
  </tr>
`;
  }

  $("#orderDetailItems").html(html);
}

function getStockInputClass(stock) {
  if (Number(stock) <= 2) {
    return "stock-low";
  }

  return "stock-ok";
}

function getFilteredStockProducts() {
  let keyword = $("#stockSearchInput").val();

  if (!keyword) {
    keyword = "";
  }

  keyword = keyword.trim().toLowerCase();

  const stockFilter = $("#stockStatusFilter").val();

  return allStockProducts.filter(function (product) {
    const stockS = Number(product.stock_s);
    const stockM = Number(product.stock_m);
    const stockL = Number(product.stock_l);

    const searchText = `
      ${product.id}
      ${product.name_vi || ""}
      ${product.name_en || ""}
      ${product.slug || ""}
      ${product.category_vi || ""}
      ${product.category_en || ""}
    `.toLowerCase();

    const matchKeyword = searchText.includes(keyword);

    const hasOutStock = stockS === 0 || stockM === 0 || stockL === 0;
    const hasLowStock =
      (stockS > 0 && stockS <= 2) ||
      (stockM > 0 && stockM <= 2) ||
      (stockL > 0 && stockL <= 2);

    const isAvailable = stockS > 0 && stockM > 0 && stockL > 0;

    let matchStockFilter = true;

    if (stockFilter === "out") {
      matchStockFilter = hasOutStock;
    }

    if (stockFilter === "low") {
      matchStockFilter = hasLowStock;
    }

    if (stockFilter === "available") {
      matchStockFilter = isAvailable;
    }

    return matchKeyword && matchStockFilter;
  });
}

function clearStockStats() {
  $("#statStockProducts").text(0);
  $("#statOutStockProducts").text(0);
  $("#statLowStockProducts").text(0);
  $("#statAvailableStockProducts").text(0);
  $("#statTotalStockItems").text(0);
}

function updateStockStats() {
  let totalProducts = allStockProducts.length;
  let outStockProducts = 0;
  let lowStockProducts = 0;
  let availableProducts = 0;
  let totalStockItems = 0;

  for (let i = 0; i < allStockProducts.length; i++) {
    let product = allStockProducts[i];

    let stockS = Number(product.stock_s);
    let stockM = Number(product.stock_m);
    let stockL = Number(product.stock_l);

    totalStockItems += stockS + stockM + stockL;

    let hasOutStock = stockS === 0 || stockM === 0 || stockL === 0;

    let hasLowStock =
      (stockS > 0 && stockS <= 2) ||
      (stockM > 0 && stockM <= 2) ||
      (stockL > 0 && stockL <= 2);

    let isAvailable = stockS > 0 && stockM > 0 && stockL > 0;

    if (hasOutStock) {
      outStockProducts++;
    }

    if (hasLowStock) {
      lowStockProducts++;
    }

    if (isAvailable) {
      availableProducts++;
    }
  }

  $("#statStockProducts").text(totalProducts);
  $("#statOutStockProducts").text(outStockProducts);
  $("#statLowStockProducts").text(lowStockProducts);
  $("#statAvailableStockProducts").text(availableProducts);
  $("#statTotalStockItems").text(totalStockItems);
}

function renderProductStock(products) {
  if (!products || products.length === 0) {
    $("#stockTableBody").html(`
    <tr>
      <td colspan="7" class="text-center">
        Không có sản phẩm phù hợp
      </td>
    </tr>
  `);
    return;
  }

  let html = "";

  for (let i = 0; i < products.length; i++) {
    let product = products[i];

    html += `
      <tr>
        <td>${product.id}</td>

        <td>
          <div class="stock-product-info">
          <img 
  src="${escapeHtml(product.image)}" 
  alt="${escapeHtml(product.name_vi)}" 
  class="stock-product-image"
/>

            <div>
              <div class="stock-product-name">${escapeHtml(product.name_vi)}</div>
              <div class="stock-product-slug">${escapeHtml(product.slug)}</div>
            </div>
          </div>
        </td>

     <td>${escapeHtml(product.category_vi || "Chưa phân loại")}</td>

        <td>
          <input
  type="number"
  min="0"
  max="${MAX_STOCK_PER_SIZE}"
  class="form-control stock-input ${getStockInputClass(product.stock_s)}"
  data-id="${product.id}"
  data-size="s"
  data-original-value="${product.stock_s}"
  value="${product.stock_s}"
/>
        </td>

        <td>
          <input
            type="number"
            min="0"
            max="${MAX_STOCK_PER_SIZE}"
            class="form-control stock-input ${getStockInputClass(product.stock_m)}"
            data-id="${product.id}"
            data-size="m"
            data-original-value="${product.stock_m}"
            value="${product.stock_m}"
          />
        </td>

        <td>
          <input
            type="number"
            min="0"
            max="${MAX_STOCK_PER_SIZE}"
            class="form-control stock-input ${getStockInputClass(product.stock_l)}"
            data-id="${product.id}"
            data-size="l"
            data-original-value="${product.stock_l}"
            value="${product.stock_l}"
          />
        </td>

        <td>
          <button 
  type="button"
  class="btn btn-sm btn-primary btn-update-stock"
  data-id="${product.id}"
  disabled
>
  Lưu tồn kho
</button>
        </td>
      </tr>
    `;
  }

  $("#stockTableBody").html(html);
}

async function loadProductStock() {
  if (isLoadingStock) {
    return;
  }

  isLoadingStock = true;
  $("#btnLoadProductStock").prop("disabled", true);
  try {
    $("#stockMessage").text("Đang tải tồn kho...");

    const adminToken = await getValidAdminToken();

    const response = await fetch(API_BASE_URL + "/products/admin/stock", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + adminToken,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      if (response.status === 401 || response.status === 403) {
        handleAdminSessionExpired();
      }

      throw new Error(result.message || "Không thể tải tồn kho.");
    }
    allStockProducts = result.data;

    updateStockStats();
    renderProductStock(getFilteredStockProducts());

    $("#stockMessage").text("Đã tải tồn kho sản phẩm.");
  } catch (error) {
    $("#stockMessage").text(error.message);
  } finally {
    isLoadingStock = false;
    $("#btnLoadProductStock").prop("disabled", false);
  }
}

async function updateProductStock(productId) {
  if (isUpdatingStock) {
    return;
  }

  isUpdatingStock = true;
  $('.btn-update-stock[data-id="' + productId + '"]').prop("disabled", true);
  try {
    const stockS = Number(
      $('.stock-input[data-id="' + productId + '"][data-size="s"]').val(),
    );

    const stockM = Number(
      $('.stock-input[data-id="' + productId + '"][data-size="m"]').val(),
    );

    const stockL = Number(
      $('.stock-input[data-id="' + productId + '"][data-size="l"]').val(),
    );

    if (
      Number.isNaN(stockS) ||
      Number.isNaN(stockM) ||
      Number.isNaN(stockL) ||
      stockS < 0 ||
      stockM < 0 ||
      stockL < 0 ||
      stockS > MAX_STOCK_PER_SIZE ||
      stockM > MAX_STOCK_PER_SIZE ||
      stockL > MAX_STOCK_PER_SIZE ||
      !Number.isInteger(stockS) ||
      !Number.isInteger(stockM) ||
      !Number.isInteger(stockL)
    ) {
      $("#stockMessage").text(
        "Tồn kho phải là số nguyên từ 0 đến " + MAX_STOCK_PER_SIZE + ".",
      );
      return;
    }

    const adminToken = await getValidAdminToken();

    const response = await fetch(
      API_BASE_URL + "/products/admin/stock/" + productId,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + adminToken,
        },
        body: JSON.stringify({
          stock_s: stockS,
          stock_m: stockM,
          stock_l: stockL,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      if (response.status === 401 || response.status === 403) {
        handleAdminSessionExpired();
      }

      throw new Error(result.message || "Không thể cập nhật tồn kho.");
    }

    await loadProductStock();

    $("#stockMessage").text("Đã cập nhật tồn kho sản phẩm #" + productId + ".");
  } catch (error) {
    $("#stockMessage").text(error.message);
  } finally {
    isUpdatingStock = false;

    if ($('.stock-input[data-id="' + productId + '"]').length) {
      updateStockSaveButtonState(productId);
    }
  }
}

function isValidStockValue(value) {
  return (
    !Number.isNaN(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_STOCK_PER_SIZE
  );
}

function updateStockSaveButtonState(productId) {
  let hasChanged = false;
  let hasInvalidValue = false;

  $('.stock-input[data-id="' + productId + '"]').each(function () {
    let originalValue = Number($(this).data("original-value"));
    let currentValue = Number($(this).val());

    if (!isValidStockValue(currentValue)) {
      hasInvalidValue = true;
    }

    if (originalValue !== currentValue) {
      hasChanged = true;
    }
  });

  $('.btn-update-stock[data-id="' + productId + '"]').prop(
    "disabled",
    !hasChanged || hasInvalidValue,
  );
}

$(document).ready(function () {
  updateAdminLoginStatus();

  /*
    Nếu adminToken còn trong localStorage,
    tự tải đơn hàng khi mở trang admin.
  */
  if (getAdminToken()) {
    loadOrderStats();
    loadOrders();
  }

  $("#btnLoadOrders").click(async function () {
    currentOrderPage = 1;
    await loadOrderStats();
    await loadOrders();
  });

  $("#btnPrevOrderPage").click(function () {
    if (currentOrderPage <= 1) {
      return;
    }

    currentOrderPage--;
    loadOrders();
  });

  $("#btnNextOrderPage").click(function () {
    if (currentOrderPage >= totalOrderPages) {
      return;
    }

    currentOrderPage++;
    loadOrders();
  });

  $(document).on("click", ".btn-update-status", function () {
    let orderId = $(this).data("id");
    let status = $('.order-status[data-id="' + orderId + '"]').val();

    if (status === "cancelled") {
      let confirmCancel = confirm(
        "Bạn có chắc muốn hủy đơn này không? Tồn kho sản phẩm sẽ được cộng lại.",
      );

      if (!confirmCancel) {
        return;
      }
    }

    updateOrderStatus(orderId, status);
  });

  $(document).on("click", ".btn-view-order", function () {
    let orderId = $(this).data("id");

    loadOrderDetail(orderId);
  });

  $("#orderStatusFilter").change(function () {
    let status = $(this).val();

    currentOrderPage = 1;

    $(".admin-stat-filter").removeClass("active");
    $('.admin-stat-filter[data-status="' + status + '"]').addClass("active");

    loadOrders();
  });

  $("#orderSearchInput").on("input", function () {
    clearTimeout(orderSearchTimer);

    orderSearchTimer = setTimeout(function () {
      currentOrderPage = 1;
      loadOrders();
    }, 400);
  });
  $("#btnClearOrderFilter").click(function () {
    clearTimeout(orderSearchTimer);

    $("#orderStatusFilter").val("all");
    $("#orderSearchInput").val("");
    $("#orderDetailBox").hide();

    $(".admin-stat-filter").removeClass("active");
    $('.admin-stat-filter[data-status="all"]').addClass("active");

    currentOrderPage = 1;
    loadOrders();
  });
  $("#btnAdminLogout").click(function () {
    clearTimeout(orderSearchTimer);
    clearTimeout(stockSearchTimer);

    clearAdminToken();

    $("#adminKeyInput").val("");

    $("#orderStatusFilter").val("all");
    $("#orderSearchInput").val("");

    $("#stockSearchInput").val("");
    $("#stockStatusFilter").val("all");

    $(".admin-stat-filter").removeClass("active");
    $('.admin-stat-filter[data-status="all"]').addClass("active");

    $(".stock-stat-filter").removeClass("active");
    $('.stock-stat-filter[data-stock-filter="all"]').addClass("active");

    updateAdminLoginStatus();
    resetAdminDataView();

    showAdminMessage("Đã đăng xuất admin.", "success");
    $("#stockMessage").text("");
  });
  $(document).on("click", ".admin-stat-filter", function () {
    let status = $(this).data("status");

    currentOrderPage = 1;

    $(".admin-stat-filter").removeClass("active");
    $(this).addClass("active");

    $("#orderStatusFilter").val(status);

    loadOrders();
  });
  $(document).on("change", ".order-status", function () {
    let orderId = $(this).data("id");
    let currentStatus = $(this).data("current-status");
    let newStatus = $(this).val();

    let saveButton = $('.btn-update-status[data-id="' + orderId + '"]');

    $(this).removeClass(
      "status-pending status-confirmed status-shipping status-completed status-cancelled",
    );
    $(this).addClass(getAdminStatusClass(newStatus));

    if (newStatus === currentStatus) {
      saveButton.prop("disabled", true);
    } else {
      saveButton.prop("disabled", false);
    }
  });
  $("#btnLoadProductStock").click(function () {
    loadProductStock();
  });

  $(document).on("click", ".btn-update-stock", function () {
    const productId = $(this).data("id");

    updateProductStock(productId);
  });

  $(document).on("input", ".stock-input", function () {
    const value = Number($(this).val());
    const productId = $(this).data("id");

    $(this).removeClass("stock-low stock-ok is-invalid");

    if (!isValidStockValue(value)) {
      $(this).addClass("is-invalid");
      $("#stockMessage").text(
        "Tồn kho phải là số nguyên từ 0 đến " + MAX_STOCK_PER_SIZE + ".",
      );
    } else {
      if (value <= 2) {
        $(this).addClass("stock-low");
      } else {
        $(this).addClass("stock-ok");
      }

      $("#stockMessage").text("");
    }

    updateStockSaveButtonState(productId);
  });
  $("#stockSearchInput").on("input", function () {
    clearTimeout(stockSearchTimer);

    stockSearchTimer = setTimeout(function () {
      renderProductStock(getFilteredStockProducts());
    }, 300);
  });

  $("#stockStatusFilter").change(function () {
    let stockFilter = $(this).val();

    $(".stock-stat-filter").removeClass("active");
    $('.stock-stat-filter[data-stock-filter="' + stockFilter + '"]').addClass(
      "active",
    );

    renderProductStock(getFilteredStockProducts());
  });

  $("#btnClearStockFilter").click(function () {
    clearTimeout(stockSearchTimer);

    $("#stockSearchInput").val("");
    $("#stockStatusFilter").val("all");

    $(".stock-stat-filter").removeClass("active");
    $('.stock-stat-filter[data-stock-filter="all"]').addClass("active");

    renderProductStock(getFilteredStockProducts());
  });

  $(document).on("click", ".stock-stat-filter", function () {
    let stockFilter = $(this).data("stock-filter");

    $(".stock-stat-filter").removeClass("active");
    $(this).addClass("active");

    $("#stockStatusFilter").val(stockFilter);

    renderProductStock(getFilteredStockProducts());
  });
});
