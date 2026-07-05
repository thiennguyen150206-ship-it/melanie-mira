const crypto = require("crypto");
const pool = require("../config/db");
const sendServerError = require("../utils/errorResponse");
const parsePositiveInt = require("../utils/parseId");
const MAX_QUANTITY_PER_ITEM = 10;
const MAX_TOTAL_QUANTITY_PER_ORDER = 20;
const MAX_ORDER_ITEM_LINES = 10;
const MAX_CUSTOMER_NAME_LENGTH = 100;
const MAX_CUSTOMER_EMAIL_LENGTH = 150;
const MAX_CUSTOMER_PHONE_LENGTH = 20;
const MAX_CUSTOMER_ADDRESS_LENGTH = 255;
const MAX_ORDER_NOTE_LENGTH = 500;
const MAX_ADMIN_ORDER_LIMIT = 100;

function padTwoDigits(value) {
  return String(value).padStart(2, "0");
}

function createOrderCode() {
  const now = new Date();

  const year = now.getFullYear();
  const month = padTwoDigits(now.getMonth() + 1);
  const day = padTwoDigits(now.getDate());
  const hour = padTwoDigits(now.getHours());
  const minute = padTwoDigits(now.getMinutes());
  const second = padTwoDigits(now.getSeconds());
  const randomNumber = crypto.randomInt(1000, 10000);

  return "MM" + year + month + day + hour + minute + second + randomNumber;
}

async function createUniqueOrderCode(connection) {
  for (let i = 0; i < 5; i++) {
    const orderCode = createOrderCode();

    const [existingOrders] = await connection.query(
      `
      SELECT id
      FROM orders
      WHERE order_code = ?
      LIMIT 1
      `,
      [orderCode],
    );

    if (existingOrders.length === 0) {
      return orderCode;
    }
  }

  throw new Error("Cannot generate unique order code");
}

function buildPaymentContent(orderCode) {
  return orderCode;
}

function isValidOrderCode(orderCode) {
  return /^MM[0-9A-Z]+$/.test(orderCode);
}

function isValidPhoneNumber(phone) {
  return /^0\d{9}$/.test(phone);
}

function isTooLong(value, maxLength) {
  if (!value) {
    return false;
  }

  return String(value).length > maxLength;
}

function normalizeOrderItems(items) {
  const allowedSizes = ["S", "M", "L"];
  const itemMap = {};

  for (const item of items) {
    const productId = Number(item.product_id);
    const size = String(item.size || "")
      .trim()
      .toUpperCase();
    const quantity = Number(item.quantity);

    if (
      Number.isNaN(productId) ||
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !allowedSizes.includes(size) ||
      Number.isNaN(quantity) ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > MAX_QUANTITY_PER_ITEM
    ) {
      return null;
    }

    const key = productId + "-" + size;

    if (!itemMap[key]) {
      itemMap[key] = {
        product_id: productId,
        size: size,
        quantity: 0,
      };
    }

    itemMap[key].quantity += quantity;
  }

  const normalizedItems = Object.values(itemMap);

  let totalQuantity = 0;

  for (let i = 0; i < normalizedItems.length; i++) {
    totalQuantity += normalizedItems[i].quantity;

    if (normalizedItems[i].quantity > MAX_QUANTITY_PER_ITEM) {
      return null;
    }
  }

  if (normalizedItems.length > MAX_ORDER_ITEM_LINES) {
    return null;
  }

  if (totalQuantity > MAX_TOTAL_QUANTITY_PER_ORDER) {
    return null;
  }

  return normalizedItems;
}

// POST /api/orders
async function createOrder(req, res) {
  const connection = await pool.getConnection();

  try {
    const userId = req.user ? req.user.id : null;
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      note,
      payment_method,
      items,
    } = req.body;

    const customerName = customer_name ? customer_name.trim() : "";
    const customerEmail = customer_email ? customer_email.trim() : null;
    const customerPhone = customer_phone ? customer_phone.trim() : "";
    const customerAddress = customer_address ? customer_address.trim() : "";
    const orderNote = note ? note.trim() : null;
    const paymentMethod = payment_method || "cod";

    const validPaymentMethods = ["cod", "bank_transfer"];

    // Kiểm tra dữ liệu khách hàng
    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({
        success: false,
        message: "Please provide customer name, phone and address",
      });
    }

    if (!isValidPhoneNumber(customerPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must have 10 digits and start with 0",
      });
    }

    if (
      isTooLong(customerName, MAX_CUSTOMER_NAME_LENGTH) ||
      isTooLong(customerEmail, MAX_CUSTOMER_EMAIL_LENGTH) ||
      isTooLong(customerPhone, MAX_CUSTOMER_PHONE_LENGTH) ||
      isTooLong(customerAddress, MAX_CUSTOMER_ADDRESS_LENGTH) ||
      isTooLong(orderNote, MAX_ORDER_NOTE_LENGTH)
    ) {
      return res.status(400).json({
        success: false,
        message: "Order information is too long",
      });
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    const normalizedItems = normalizeOrderItems(items);

    if (!normalizedItems) {
      return res.status(400).json({
        success: false,
        message: "Invalid product item or quantity exceeds allowed limit",
      });
    }

    await connection.beginTransaction();

    let totalAmount = 0;
    const orderItems = [];

    // Kiểm tra từng sản phẩm trong giỏ hàng
    for (const item of normalizedItems) {
      const { product_id, size, quantity } = item;
      const orderQuantity = Number(quantity);

      if (
        !product_id ||
        !size ||
        Number.isNaN(orderQuantity) ||
        !Number.isInteger(orderQuantity) ||
        orderQuantity <= 0
      ) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: "Invalid product item",
        });
      }

      const [products] = await connection.query(
        `
        SELECT id, name_vi, price
        FROM products
        WHERE id = ? AND is_active = 1
        LIMIT 1
        `,
        [product_id],
      );

      if (products.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: `Product ID ${product_id} not found`,
        });
      }

      const product = products[0];

      const [sizes] = await connection.query(
        `
  SELECT stock
  FROM product_sizes
  WHERE product_id = ? AND size = ?
  LIMIT 1
  FOR UPDATE
  `,
        [product_id, size],
      );

      if (sizes.length === 0) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: `Size ${size} is not available for product ${product.name_vi}`,
        });
      }

      const currentStock = sizes[0].stock;

      if (currentStock < orderQuantity) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name_vi} size ${size}`,
        });
      }

      const price = Number(product.price);
      const subtotal = price * orderQuantity;

      totalAmount += subtotal;

      orderItems.push({
        product_id,
        product_name: product.name_vi,
        size,
        quantity: orderQuantity,
        price,
        subtotal,
      });
    }

    // Tạo đơn hàng

    const orderCode = await createUniqueOrderCode(connection);
    const paymentStatus = "unpaid";
    const paidAmount = 0;
    const paymentContent = buildPaymentContent(orderCode);
    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (
        order_code,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        note,
        total_amount,
        payment_method,
        payment_status,
        paid_amount,
        payment_content,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderCode,
        userId,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        orderNote,
        totalAmount,
        paymentMethod,
        paymentStatus,
        paidAmount,
        paymentContent,
        "pending",
      ],
    );

    const orderId = orderResult.insertId;

    // Thêm từng sản phẩm vào order_items và trừ tồn kho
    for (const item of orderItems) {
      await connection.query(
        `
        INSERT INTO order_items (
          order_id,
          product_id,
          product_name,
          size,
          quantity,
          price,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.product_id,
          item.product_name,
          item.size,
          item.quantity,
          item.price,
          item.subtotal,
        ],
      );

      const [stockUpdateResult] = await connection.query(
        `
  UPDATE product_sizes
  SET stock = stock - ?
  WHERE product_id = ? 
  AND size = ?
  AND stock >= ?
  `,
        [item.quantity, item.product_id, item.size, item.quantity],
      );

      if (stockUpdateResult.affectedRows === 0) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Not enough stock for " + item.product_name + " size " + item.size,
        });
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order_id: orderId,
        order_code: orderCode,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        paid_amount: paidAmount,
        payment_content: paymentContent,
        status: "pending",
      },
    });
  } catch (error) {
    await connection.rollback();

    return sendServerError(res, "Cannot create order", error);
  } finally {
    connection.release();
  }
}

// GET /api/orders/payment-status/:orderCode
async function getPaymentStatus(req, res) {
  try {
    const orderCode = req.params.orderCode
      ? String(req.params.orderCode).trim().toUpperCase()
      : "";

    if (!orderCode || orderCode.length > 30 || !isValidOrderCode(orderCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order code",
      });
    }

    const [orders] = await pool.query(
      `
      SELECT
        id,
        order_code,
        total_amount,
        payment_method,
        payment_status,
        paid_amount,
        paid_at,
        payment_content,
        payment_note,
        status,
        created_at
      FROM orders
      WHERE order_code = ?
      LIMIT 1
      `,
      [orderCode],
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];

    res.json({
      success: true,
      data: {
        order_id: order.id,
        order_code: order.order_code,
        total_amount: Number(order.total_amount),
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        paid_amount: Number(order.paid_amount || 0),
        paid_at: order.paid_at,
        payment_content: order.payment_content,
        payment_note: order.payment_note,
        status: order.status,
        created_at: order.created_at,
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot get payment status", error);
  }
}

// GET /api/orders
async function getAllOrders(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status ? req.query.status.trim() : "";
    const search = req.query.search ? req.query.search.trim() : "";

    const allowedStatuses = [
      "pending",
      "confirmed",
      "shipping",
      "completed",
      "cancelled",
    ];

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid page",
      });
    }

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_ADMIN_ORDER_LIMIT
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit",
      });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    if (search.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Search keyword is too long",
      });
    }

    const offset = (page - 1) * limit;

    const whereConditions = [];
    const queryParams = [];

    if (status) {
      whereConditions.push("status = ?");
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push(`
    (
           CAST(id AS CHAR) LIKE ?
      OR order_code LIKE ?
      OR customer_name LIKE ?
      OR customer_email LIKE ?
      OR customer_phone LIKE ?
      OR customer_address LIKE ?
    )
  `);

      const searchKeyword = `%${search}%`;

      queryParams.push(
        searchKeyword,
        searchKeyword,
        searchKeyword,
        searchKeyword,
        searchKeyword,
        searchKeyword,
      );
    }

    const whereSql =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM orders
      ${whereSql}
      `,
      queryParams,
    );

    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    const [orders] = await pool.query(
      `
         SELECT
        id,
        order_code,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        note,
        total_amount,
        payment_method,
        payment_status,
        paid_amount,
        paid_at,
        payment_content,
        payment_note,
        status,
        created_at
      FROM orders
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...queryParams, limit, offset],
    );

    res.json({
      success: true,
      count: orders.length,
      data: orders,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        total_pages: totalPages,
        status: status || null,
        search: search || null,
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot get orders", error);
  }
}

// GET /api/orders/stats
async function getOrderStats(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total_orders,

        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_orders,
        SUM(CASE WHEN status = 'shipping' THEN 1 ELSE 0 END) AS shipping_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,

        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS valid_revenue
      FROM orders
    `);

    const stats = rows[0];

    res.json({
      success: true,
      data: {
        total_orders: Number(stats.total_orders),
        pending_orders: Number(stats.pending_orders),
        confirmed_orders: Number(stats.confirmed_orders),
        shipping_orders: Number(stats.shipping_orders),
        completed_orders: Number(stats.completed_orders),
        cancelled_orders: Number(stats.cancelled_orders),
        valid_revenue: Number(stats.valid_revenue),
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot get order stats", error);
  }
}

// GET /api/orders/:id
async function getOrderById(req, res) {
  try {
    const orderId = parsePositiveInt(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const [orders] = await pool.query(
      `
            SELECT 
        id,
        order_code,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        note,
        total_amount,
        payment_method,
        payment_status,
        paid_amount,
        paid_at,
        payment_content,
        payment_note,
        status,
        created_at
      FROM orders
      WHERE id = ?
      LIMIT 1
      `,
      [orderId],
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const [items] = await pool.query(
      `
      SELECT 
        id,
        product_id,
        product_name,
        size,
        quantity,
        price,
        subtotal
      FROM order_items
      WHERE order_id = ?
      `,
      [orderId],
    );

    res.json({
      success: true,
      data: {
        ...orders[0],
        items: items,
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot get order detail", error);
  }
}

function getAllowedNextStatuses(currentStatus) {
  if (currentStatus === "pending") {
    return ["confirmed", "cancelled"];
  }

  if (currentStatus === "confirmed") {
    return ["shipping", "cancelled"];
  }

  if (currentStatus === "shipping") {
    return ["completed"];
  }

  return [];
}

// PATCH /api/orders/:id/status
async function updateOrderStatus(req, res) {
  const connection = await pool.getConnection();

  try {
    const orderId = parsePositiveInt(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "shipping",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    await connection.beginTransaction();

    const [orders] = await connection.query(
      `
      SELECT id, status
      FROM orders
      WHERE id = ?
      LIMIT 1
      `,
      [orderId],
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const oldStatus = orders[0].status;

    if (oldStatus === status) {
      await connection.rollback();

      return res.json({
        success: true,
        message: "Order status is already " + status,
        data: {
          order_id: Number(orderId),
          old_status: oldStatus,
          new_status: status,
        },
      });
    }

    if (oldStatus === "cancelled") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Cancelled order cannot be changed",
      });
    }

    if (oldStatus === "completed") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Completed order cannot be changed",
      });
    }

    const allowedNextStatuses = getAllowedNextStatuses(oldStatus);

    if (!allowedNextStatuses.includes(status)) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Invalid status transition from " + oldStatus + " to " + status,
      });
    }

    /*
      Nếu chuyển đơn sang cancelled:
      cộng lại tồn kho cho từng sản phẩm trong đơn.
    */
    if (status === "cancelled") {
      const [items] = await connection.query(
        `
        SELECT product_id, size, quantity
        FROM order_items
        WHERE order_id = ?
        `,
        [orderId],
      );

      for (const item of items) {
        await connection.query(
          `
          UPDATE product_sizes
          SET stock = stock + ?
          WHERE product_id = ? AND size = ?
          `,
          [item.quantity, item.product_id, item.size],
        );
      }
    }

    await connection.query(
      `
      UPDATE orders
      SET status = ?
      WHERE id = ?
      `,
      [status, orderId],
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: {
        order_id: Number(orderId),
        old_status: oldStatus,
        new_status: status,
      },
    });
  } catch (error) {
    await connection.rollback();

    return sendServerError(res, "Cannot update order status", error);
  } finally {
    connection.release();
  }
}
module.exports = {
  createOrder,
  getPaymentStatus,
  getAllOrders,
  getOrderStats,
  getOrderById,
  updateOrderStatus,
};
