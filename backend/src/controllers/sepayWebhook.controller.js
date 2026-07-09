const pool = require("../config/db");
const sendServerError = require("../utils/errorResponse");

function getApiKeyFromHeader(req) {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Apikey ")) {
    return "";
  }

  return authorization.replace("Apikey ", "").trim();
}

function getOrderCodeFromPayload(payload) {
  if (payload.code) {
    return String(payload.code).trim().toUpperCase();
  }

  const content = payload.content || payload.description || "";
  const matched = String(content).match(/MM\d{18}/);

  return matched ? matched[0] : "";
}

function isValidOrderCode(orderCode) {
  return /^MM\d{18}$/.test(orderCode);
}

async function handleSePayWebhook(req, res) {
  const connection = await pool.getConnection();

  try {
    const expectedApiKey = process.env.SEPAY_WEBHOOK_API_KEY;
    const receivedApiKey = getApiKeyFromHeader(req);

    if (!expectedApiKey || receivedApiKey !== expectedApiKey) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized webhook",
      });
    }

    const payload = req.body;

    const transferType = payload.transferType;
    const transferAmount = Number(payload.transferAmount || 0);
    const accountNumber = payload.accountNumber
      ? String(payload.accountNumber)
      : "";
    const expectedAccountNumber = process.env.SEPAY_BANK_ACCOUNT || "";

    const orderCode = getOrderCodeFromPayload(payload);
    const transactionDate = payload.transactionDate || null;
    const paymentNote = payload.content || payload.description || "";

    if (transferType !== "in") {
      return res.json({ success: true });
    }

    if (expectedAccountNumber && accountNumber !== expectedAccountNumber) {
      return res.json({ success: true });
    }

    if (!isValidOrderCode(orderCode)) {
      return res.json({ success: true });
    }

    if (!transferAmount || transferAmount <= 0) {
      return res.json({ success: true });
    }

    await connection.beginTransaction();

    const [orders] = await connection.query(
      `
      SELECT id, order_code, total_amount, payment_status
      FROM orders
      WHERE order_code = ?
      LIMIT 1
      FOR UPDATE
      `,
      [orderCode],
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.json({ success: true });
    }

    const order = orders[0];
    const totalAmount = Number(order.total_amount);

    if (order.payment_status === "paid") {
      await connection.rollback();
      return res.json({ success: true });
    }

    if (transferAmount < totalAmount) {
      await connection.query(
        `
      UPDATE orders
      SET
        payment_status = 'underpaid',
        paid_amount = ?,
        paid_at = ?,
        payment_note = ?
      WHERE id = ?
    `,
        [
          transferAmount,
          transactionDate,
          "Thanh toán thiếu. Số tiền đã nhận: " +
            transferAmount +
            ". Tổng đơn: " +
            totalAmount +
            ". Nội dung: " +
            paymentNote,
          order.id,
        ],
      );

      await connection.commit();

      return res.json({
        success: true,
        message: "Underpaid payment recorded",
      });
    }

    await connection.query(
      `
      UPDATE orders
      SET
        payment_status = ?,
        paid_amount = ?,
        paid_at = ?,
        payment_note = ?
      WHERE id = ?
      `,
      ["paid", transferAmount, transactionDate, paymentNote, order.id],
    );

    await connection.commit();

    return res.json({ success: true });
  } catch (error) {
    await connection.rollback();

    return sendServerError(res, "Cannot handle SePay webhook", error);
  } finally {
    connection.release();
  }
}

module.exports = {
  handleSePayWebhook,
};
