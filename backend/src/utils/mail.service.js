const nodemailer = require("nodemailer");

function isMailEnabled() {
  return !!process.env.MAIL_USER && !!process.env.MAIL_PASS;
}

function getShopName() {
  return process.env.SHOP_NAME || "Melanie Mira";
}

function getShopNotifyEmail() {
  return process.env.SHOP_NOTIFY_EMAIL || process.env.MAIL_USER;
}

function formatMailMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function escapeMailHtml(value) {
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

function getPaymentMethodText(paymentMethod) {
  if (paymentMethod === "bank_transfer") {
    return "Chuyển khoản ngân hàng";
  }

  if (paymentMethod === "cod") {
    return "Thanh toán khi nhận hàng";
  }

  return paymentMethod || "Chưa xác định";
}

function getPaymentStatusText(paymentStatus) {
  if (paymentStatus === "paid") {
    return "Đã thanh toán";
  }

  if (paymentStatus === "underpaid") {
    return "Thanh toán thiếu";
  }

  if (paymentStatus === "overpaid") {
    return "Thanh toán dư";
  }

  return "Chưa thanh toán";
}

function getOrderStatusText(status) {
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

  return status || "Chờ xác nhận";
}

function createMailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

function createOrderItemsHtml(items) {
  let html = "";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    html += `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          ${escapeMailHtml(item.product_name)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">
          ${escapeMailHtml(item.size)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">
          ${Number(item.quantity)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">
          ${formatMailMoney(item.price)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">
          ${formatMailMoney(item.subtotal)}
        </td>
      </tr>
    `;
  }

  return html;
}

function createOrderItemsText(items) {
  let text = "";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    text +=
      "- " +
      item.product_name +
      " | Size " +
      item.size +
      " | SL " +
      item.quantity +
      " | " +
      formatMailMoney(item.subtotal) +
      "\n";
  }

  return text;
}

function createOrderSummaryHtml(order, items, mode) {
  const shopName = getShopName();
  const isShopEmail = mode === "shop";

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;">
      <h2 style="margin:0 0 12px;color:#111;">
        ${isShopEmail ? "Đơn hàng mới" : "Cảm ơn bạn đã đặt hàng tại " + shopName}
      </h2>

      <p style="margin:0 0 16px;">
        ${
          isShopEmail
            ? "Website vừa ghi nhận một đơn hàng mới."
            : "Đơn hàng của bạn đã được ghi nhận. Shop sẽ kiểm tra thanh toán và xử lý đơn trong thời gian sớm nhất."
        }
      </p>

      <div style="padding:14px;border:1px solid #eee;border-radius:10px;margin-bottom:16px;">
        <p><strong>Mã đơn:</strong> ${escapeMailHtml(order.order_code)}</p>
        <p><strong>Khách hàng:</strong> ${escapeMailHtml(order.customer_name)}</p>
        <p><strong>Số điện thoại:</strong> ${escapeMailHtml(order.customer_phone)}</p>
        <p><strong>Email:</strong> ${escapeMailHtml(order.customer_email || "Không có")}</p>
        <p><strong>Địa chỉ:</strong> ${escapeMailHtml(order.customer_address)}</p>
        <p><strong>Ghi chú:</strong> ${escapeMailHtml(order.note || "Không có")}</p>
        <p><strong>Phương thức thanh toán:</strong> ${escapeMailHtml(getPaymentMethodText(order.payment_method))}</p>
        <p><strong>Trạng thái thanh toán:</strong> ${escapeMailHtml(getPaymentStatusText(order.payment_status))}</p>
        <p><strong>Trạng thái đơn:</strong> ${escapeMailHtml(getOrderStatusText(order.status))}</p>
      </div>

      <h3 style="margin:0 0 10px;">Sản phẩm</h3>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr>
            <th style="padding:8px;border-bottom:1px solid #ddd;text-align:left;">Sản phẩm</th>
            <th style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">Size</th>
            <th style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">SL</th>
            <th style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">Giá</th>
            <th style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">Tạm tính</th>
          </tr>
        </thead>

        <tbody>
          ${createOrderItemsHtml(items)}
        </tbody>
      </table>

      <div style="padding:14px;background:#fafafa;border-radius:10px;">
        <p><strong>Tạm tính:</strong> ${formatMailMoney(order.subtotal_amount)}</p>
        <p><strong>Mã giảm giá:</strong> ${escapeMailHtml(order.coupon_code || "Không có")}</p>
        <p><strong>Giảm giá:</strong> ${formatMailMoney(order.discount_amount)}</p>
        <p style="font-size:18px;"><strong>Tổng thanh toán:</strong> ${formatMailMoney(order.total_amount)}</p>
        <p><strong>Nội dung chuyển khoản:</strong> ${escapeMailHtml(order.payment_content || order.order_code)}</p>
      </div>

      <p style="margin-top:18px;color:#666;font-size:13px;">
        Email này được gửi tự động từ hệ thống ${shopName}.
      </p>
    </div>
  `;
}

function createOrderSummaryText(order, items, mode) {
  const shopName = getShopName();
  const isShopEmail = mode === "shop";

  return `
${isShopEmail ? "Đơn hàng mới" : "Cảm ơn bạn đã đặt hàng tại " + shopName}

Mã đơn: ${order.order_code}
Khách hàng: ${order.customer_name}
Số điện thoại: ${order.customer_phone}
Email: ${order.customer_email || "Không có"}
Địa chỉ: ${order.customer_address}
Ghi chú: ${order.note || "Không có"}
Phương thức thanh toán: ${getPaymentMethodText(order.payment_method)}
Trạng thái thanh toán: ${getPaymentStatusText(order.payment_status)}
Trạng thái đơn: ${getOrderStatusText(order.status)}

Sản phẩm:
${createOrderItemsText(items)}

Tạm tính: ${formatMailMoney(order.subtotal_amount)}
Mã giảm giá: ${order.coupon_code || "Không có"}
Giảm giá: ${formatMailMoney(order.discount_amount)}
Tổng thanh toán: ${formatMailMoney(order.total_amount)}
Nội dung chuyển khoản: ${order.payment_content || order.order_code}

Email này được gửi tự động từ hệ thống ${shopName}.
`;
}

async function sendShopNewOrderEmail(order, items) {
  const transporter = createMailTransporter();
  const shopEmail = getShopNotifyEmail();

  await transporter.sendMail({
    from: `"${getShopName()}" <${process.env.MAIL_USER}>`,
    to: shopEmail,
    subject: "[Melanie Mira] Đơn hàng mới " + order.order_code,
    text: createOrderSummaryText(order, items, "shop"),
    html: createOrderSummaryHtml(order, items, "shop"),
  });
}

async function sendCustomerOrderConfirmationEmail(order, items) {
  if (!order.customer_email) {
    return;
  }

  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: `"${getShopName()}" <${process.env.MAIL_USER}>`,
    to: order.customer_email,
    subject: "Melanie Mira xác nhận đơn hàng " + order.order_code,
    text: createOrderSummaryText(order, items, "customer"),
    html: createOrderSummaryHtml(order, items, "customer"),
  });
}

async function sendOrderCreatedEmails(order, items) {
  if (!isMailEnabled()) {
    console.log("Mail service is disabled. Missing MAIL_USER or MAIL_PASS.");
    return;
  }

  const results = await Promise.allSettled([
    sendShopNewOrderEmail(order, items),
    sendCustomerOrderConfirmationEmail(order, items),
  ]);

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      console.log("Send order email failed:", results[i].reason);
    }
  }
}

module.exports = {
  sendOrderCreatedEmails,
};
