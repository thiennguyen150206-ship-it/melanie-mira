let allOrders = [];

function formatAdminMoney(price) {
  return Number(price).toLocaleString("vi-VN") + "đ";
}

function getAdminKey() {
  return $("#adminKeyInput").val().trim();
}

function getStatusOptions(currentStatus) {
  const statuses = [
    "pending",
    "confirmed",
    "shipping",
    "completed",
    "cancelled",
  ];

  let html = "";

  for (let i = 0; i < statuses.length; i++) {
    let status = statuses[i];
    let selected = status === currentStatus ? "selected" : "";

    html += `<option value="${status}" ${selected}>${status}</option>`;
  }

  return html;
}

async function loadOrders() {
  let adminKey = getAdminKey();

  if (adminKey === "") {
    $("#adminMessage").text("Vui lòng nhập admin key.");
    return;
  }

  $("#adminMessage").text("");

  try {
    let response = await fetch(API_BASE_URL + "/orders", {
      method: "GET",
      headers: {
        "x-admin-key": adminKey,
      },
    });

    let result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể tải đơn hàng.");
    }

    allOrders = result.data;
    renderOrders(getFilteredOrders());
  } catch (error) {
    $("#adminMessage").text(error.message);
  }
}

function getFilteredOrders() {
  let statusFilter = $("#orderStatusFilter").val();
  let keyword = $("#orderSearchInput").val().trim().toLowerCase();

  let result = allOrders;

  if (statusFilter && statusFilter !== "all") {
    result = result.filter(function (order) {
      return order.status === statusFilter;
    });
  }

  if (keyword !== "") {
    result = result.filter(function (order) {
      let orderId = String(order.id);
      let customerName = (order.customer_name || "").toLowerCase();
      let customerPhone = (order.customer_phone || "").toLowerCase();
      let customerAddress = (order.customer_address || "").toLowerCase();

      return (
        orderId.includes(keyword) ||
        customerName.includes(keyword) ||
        customerPhone.includes(keyword) ||
        customerAddress.includes(keyword)
      );
    });
  }

  return result;
}

function renderOrders(orders) {
  let html = "";

  if (orders.length === 0) {
    $("#ordersTableBody").html(`
      <tr>
        <td colspan="9" class="text-center">Chưa có đơn hàng</td>
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
    let isLocked = order.status === "cancelled" || order.status === "completed";
    let disabledText = isLocked ? "disabled" : "";

    html += `
      <tr>
        <td>${order.id}</td>
        <td>${order.customer_name}</td>
        <td>${order.customer_phone}</td>
        <td class="admin-address">${order.customer_address}</td>
        <td>${formatAdminMoney(order.total_amount)}</td>
        <td>${order.payment_method}</td>

        <td>
          <select 
            class="form-select order-status" 
            data-id="${order.id}" 
            ${disabledText}
          >
            ${getStatusOptions(order.status)}
          </select>
        </td>

        <td>
          <button 
            class="btn btn-sm btn-primary btn-update-status" 
            data-id="${order.id}"
            ${disabledText}
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
  let adminKey = getAdminKey();

  if (adminKey === "") {
    $("#adminMessage").text("Vui lòng nhập admin key.");
    return;
  }

  try {
    let response = await fetch(
      API_BASE_URL + "/orders/" + orderId + "/status",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          status: status,
        }),
      },
    );

    let result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể cập nhật trạng thái.");
    }

    $("#adminMessage").text("Cập nhật đơn #" + orderId + " thành công.");
    loadOrders();
  } catch (error) {
    $("#adminMessage").text(error.message);
  }
}

async function loadOrderDetail(orderId) {
  let adminKey = getAdminKey();

  if (adminKey === "") {
    $("#adminMessage").text("Vui lòng nhập admin key.");
    return;
  }

  try {
    let response = await fetch(API_BASE_URL + "/orders/" + orderId, {
      method: "GET",
      headers: {
        "x-admin-key": adminKey,
      },
    });

    let result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể tải chi tiết đơn hàng.");
    }

    renderOrderDetail(result.data);
  } catch (error) {
    $("#adminMessage").text(error.message);
  }
}

function renderOrderDetail(order) {
  $("#orderDetailBox").show();

  $("#detailOrderId").text(order.id);

  $("#orderDetailInfo").html(`
    <p><strong>Khách hàng:</strong> ${order.customer_name}</p>
    <p><strong>Số điện thoại:</strong> ${order.customer_phone}</p>
    <p><strong>Địa chỉ:</strong> ${order.customer_address}</p>
    <p><strong>Trạng thái:</strong> ${order.status}</p>
    <p><strong>Tổng tiền:</strong> ${formatAdminMoney(order.total_amount)}</p>
  `);

  let html = "";

  for (let i = 0; i < order.items.length; i++) {
    let item = order.items[i];

    html += `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.size}</td>
        <td>${item.quantity}</td>
        <td>${formatAdminMoney(item.price)}</td>
        <td>${formatAdminMoney(item.subtotal)}</td>
      </tr>
    `;
  }

  $("#orderDetailItems").html(html);
}

$(document).ready(function () {
  $("#btnLoadOrders").click(function () {
    loadOrders();
  });

  $(document).on("click", ".btn-update-status", function () {
    let orderId = $(this).data("id");
    let status = $('.order-status[data-id="' + orderId + '"]').val();

    updateOrderStatus(orderId, status);
  });

  $(document).on("click", ".btn-view-order", function () {
    let orderId = $(this).data("id");

    loadOrderDetail(orderId);
  });

  $("#orderStatusFilter").change(function () {
    renderOrders(getFilteredOrders());
  });

  $("#orderSearchInput").on("input", function () {
    renderOrders(getFilteredOrders());
  });

  $("#btnClearOrderFilter").click(function () {
    $("#orderStatusFilter").val("all");
    $("#orderSearchInput").val("");

    renderOrders(getFilteredOrders());
  });
});
