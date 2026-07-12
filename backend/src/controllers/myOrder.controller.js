const pool = require("../config/db");
const sendServerError = require("../utils/errorResponse");
const parsePositiveInt = require("../utils/parseId");
const MAX_PROFILE_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 20;

const MAX_ADDRESS_NAME_LENGTH = 255;
const MAX_ADDRESS_DETAIL_LENGTH = 500;
const MAX_CITY_LENGTH = 255;
const MAX_POSTAL_CODE_LENGTH = 50;
const MAX_COUNTRY_LENGTH = 100;

function isTooLong(value, maxLength) {
  if (!value) {
    return false;
  }

  return String(value).length > maxLength;
}

// GET /api/my/orders
async function getMyOrders(req, res) {
  try {
    const userId = req.user.id;

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
  subtotal_amount,
  discount_amount,
  coupon_code,
  total_amount,
  payment_method,
  payment_status,
  paid_amount,
  status,
  shipping_provider,
  shipping_tracking_code,
  shipping_note,
  shipped_at,
  created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId],
    );

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return sendServerError(res, "Cannot get your orders", error);
  }
}

// GET /api/my/orders/:id
async function getMyOrderById(req, res) {
  try {
    const userId = req.user.id;
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
  subtotal_amount,
  discount_amount,
  coupon_code,
  total_amount,
  payment_method,
  payment_status,
  paid_amount,
  status,
  shipping_provider,
  shipping_tracking_code,
  shipping_note,
  shipped_at,
  created_at
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [orderId, userId],
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
    return sendServerError(res, "Cannot get your order detail", error);
  }
}

// GET /api/my/profile
async function getMyProfile(req, res) {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      `
      SELECT 
        id,
        full_name,
        email,
        phone,
        role,
        created_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: users[0],
    });
  } catch (error) {
    return sendServerError(res, "Cannot get profile", error);
  }
}

// PATCH /api/my/profile
async function updateMyProfile(req, res) {
  try {
    const userId = req.user.id;
    const { full_name, phone } = req.body;

    const fullName = full_name ? full_name.trim() : "";
    const userPhone = phone ? phone.trim() : "";

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (userPhone && !/^0\d{9}$/.test(userPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must have 10 digits and start with 0",
      });
    }

    if (
      isTooLong(fullName, MAX_PROFILE_NAME_LENGTH) ||
      isTooLong(userPhone, MAX_PHONE_LENGTH)
    ) {
      return res.status(400).json({
        success: false,
        message: "Profile information is too long",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET full_name = ?, phone = ?
      WHERE id = ?
      `,
      [fullName, userPhone || null, userId],
    );

    const [users] = await pool.query(
      `
      SELECT 
        id,
        full_name,
        email,
        phone,
        role,
        created_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: users[0],
    });
  } catch (error) {
    return sendServerError(res, "Cannot update profile", error);
  }
}

// GET /api/my/addresses
async function getMyAddresses(req, res) {
  try {
    const userId = req.user.id;

    const [addresses] = await pool.query(
      `
      SELECT
        id,
        full_name,
        phone,
        address,
        city,
        postal_code,
        country,
        is_default,
        created_at,
        updated_at
      FROM user_addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
      `,
      [userId],
    );

    res.json({
      success: true,
      count: addresses.length,
      data: addresses,
    });
  } catch (error) {
    return sendServerError(res, "Cannot get addresses", error);
  }
}

// POST /api/my/addresses
async function createMyAddress(req, res) {
  try {
    const userId = req.user.id;

    const {
      full_name,
      phone,
      address,
      city,
      postal_code,
      country,
      is_default,
    } = req.body;

    const fullName = full_name ? full_name.trim() : "";
    const addressPhone = phone ? phone.trim() : "";
    const addressDetail = address ? address.trim() : "";
    const addressCity = city ? city.trim() : null;
    const addressPostalCode = postal_code ? postal_code.trim() : null;
    const addressCountry = country ? country.trim() : "Việt Nam";

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (!addressPhone || !/^0\d{9}$/.test(addressPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must have 10 digits and start with 0",
      });
    }

    if (!addressDetail) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    if (
      isTooLong(fullName, MAX_ADDRESS_NAME_LENGTH) ||
      isTooLong(addressPhone, MAX_PHONE_LENGTH) ||
      isTooLong(addressDetail, MAX_ADDRESS_DETAIL_LENGTH) ||
      isTooLong(addressCity, MAX_CITY_LENGTH) ||
      isTooLong(addressPostalCode, MAX_POSTAL_CODE_LENGTH) ||
      isTooLong(addressCountry, MAX_COUNTRY_LENGTH)
    ) {
      return res.status(400).json({
        success: false,
        message: "Address information is too long",
      });
    }

    /*
  Nếu địa chỉ mới được chọn làm mặc định,
  các địa chỉ cũ của user sẽ không còn mặc định nữa.
*/
    if (is_default) {
      await pool.query(
        `
        UPDATE user_addresses
        SET is_default = 0
        WHERE user_id = ?
        `,
        [userId],
      );
    }

    const [result] = await pool.query(
      `
      INSERT INTO user_addresses (
        user_id,
        full_name,
        phone,
        address,
        city,
        postal_code,
        country,
        is_default
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        fullName,
        addressPhone,
        addressDetail,
        addressCity,
        addressPostalCode,
        addressCountry,
        is_default ? 1 : 0,
      ],
    );

    const [addresses] = await pool.query(
      `
  SELECT
    id,
    full_name,
    phone,
    address,
    city,
    postal_code,
    country,
    is_default,
    created_at,
    updated_at
  FROM user_addresses
  WHERE id = ? AND user_id = ?
  LIMIT 1
  `,
      [result.insertId, userId],
    );

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: addresses[0],
    });
  } catch (error) {
    return sendServerError(res, "Cannot create address", error);
  }
}

// PATCH /api/my/addresses/:id
async function updateMyAddress(req, res) {
  try {
    const userId = req.user.id;
    const addressId = parsePositiveInt(req.params.id);

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Invalid address id",
      });
    }

    const {
      full_name,
      phone,
      address,
      city,
      postal_code,
      country,
      is_default,
    } = req.body;

    const fullName = full_name ? full_name.trim() : "";
    const addressPhone = phone ? phone.trim() : "";
    const addressDetail = address ? address.trim() : "";
    const addressCity = city ? city.trim() : null;
    const addressPostalCode = postal_code ? postal_code.trim() : null;
    const addressCountry = country ? country.trim() : "Việt Nam";

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (!addressPhone || !/^0\d{9}$/.test(addressPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must have 10 digits and start with 0",
      });
    }

    if (!addressDetail) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    if (
      isTooLong(fullName, MAX_ADDRESS_NAME_LENGTH) ||
      isTooLong(addressPhone, MAX_PHONE_LENGTH) ||
      isTooLong(addressDetail, MAX_ADDRESS_DETAIL_LENGTH) ||
      isTooLong(addressCity, MAX_CITY_LENGTH) ||
      isTooLong(addressPostalCode, MAX_POSTAL_CODE_LENGTH) ||
      isTooLong(addressCountry, MAX_COUNTRY_LENGTH)
    ) {
      return res.status(400).json({
        success: false,
        message: "Address information is too long",
      });
    }

    const [oldAddresses] = await pool.query(
      `
      SELECT id
      FROM user_addresses
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [addressId, userId],
    );

    if (oldAddresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    if (is_default) {
      await pool.query(
        `
        UPDATE user_addresses
        SET is_default = 0
        WHERE user_id = ?
        `,
        [userId],
      );
    }

    await pool.query(
      `
      UPDATE user_addresses
      SET 
        full_name = ?,
        phone = ?,
        address = ?,
        city = ?,
        postal_code = ?,
        country = ?,
        is_default = ?
      WHERE id = ? AND user_id = ?
      `,
      [
        fullName,
        addressPhone,
        addressDetail,
        addressCity,
        addressPostalCode,
        addressCountry,
        is_default ? 1 : 0,
        addressId,
        userId,
      ],
    );

    const [addresses] = await pool.query(
      `
      SELECT
        id,
        full_name,
        phone,
        address,
        city,
        postal_code,
        country,
        is_default,
        created_at,
        updated_at
      FROM user_addresses
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [addressId, userId],
    );

    res.json({
      success: true,
      message: "Address updated successfully",
      data: addresses[0],
    });
  } catch (error) {
    return sendServerError(res, "Cannot update address", error);
  }
}

// PATCH /api/my/addresses/:id/default
async function setDefaultMyAddress(req, res) {
  try {
    const userId = req.user.id;
    const addressId = parsePositiveInt(req.params.id);

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Invalid address id",
      });
    }

    const [addresses] = await pool.query(
      `
      SELECT id
      FROM user_addresses
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [addressId, userId],
    );

    if (addresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await pool.query(
      `
      UPDATE user_addresses
      SET is_default = 0
      WHERE user_id = ?
      `,
      [userId],
    );

    await pool.query(
      `
      UPDATE user_addresses
      SET is_default = 1
      WHERE id = ? AND user_id = ?
      `,
      [addressId, userId],
    );

    res.json({
      success: true,
      message: "Default address updated successfully",
      data: {
        address_id: Number(addressId),
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot set default address", error);
  }
}

// DELETE /api/my/addresses/:id
async function deleteMyAddress(req, res) {
  try {
    const userId = req.user.id;
    const addressId = parsePositiveInt(req.params.id);

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Invalid address id",
      });
    }

    const [addresses] = await pool.query(
      `
      SELECT id, is_default
      FROM user_addresses
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [addressId, userId],
    );

    if (addresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const wasDefault = addresses[0].is_default === 1;

    await pool.query(
      `
      DELETE FROM user_addresses
      WHERE id = ? AND user_id = ?
      `,
      [addressId, userId],
    );

    /*
      Nếu địa chỉ vừa xóa là mặc định,
      tự chọn địa chỉ mới nhất còn lại làm mặc định.
    */
    if (wasDefault) {
      await pool.query(
        `
        UPDATE user_addresses
        SET is_default = 1
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId],
      );
    }

    res.json({
      success: true,
      message: "Address deleted successfully",
      data: {
        address_id: Number(addressId),
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot delete address", error);
  }
}

// PATCH /api/my/orders/:id/cancel
async function cancelMyOrder(req, res) {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const orderId = parsePositiveInt(req.params.id);

    if (!orderId) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    await connection.beginTransaction();

    const [orders] = await connection.query(
      `
  SELECT id, status, payment_method, payment_status, paid_amount
FROM orders
WHERE id = ? AND user_id = ?
LIMIT 1
FOR UPDATE
  `,
      [orderId, userId],
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];

    if (order.status !== "pending") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Only pending orders can be cancelled",
      });
    }

    const paidAmount = Number(order.paid_amount || 0);

    if (
      order.payment_method === "bank_transfer" &&
      (order.payment_status === "paid" ||
        order.payment_status === "underpaid" ||
        paidAmount > 0)
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Đơn hàng đã có thanh toán, không thể tự hủy. Vui lòng liên hệ shop để được hỗ trợ.",
      });
    }

    const [items] = await connection.query(
      `
      SELECT product_id, size, quantity
      FROM order_items
      WHERE order_id = ?
      `,
      [orderId],
    );

    for (let i = 0; i < items.length; i++) {
      await connection.query(
        `
        UPDATE product_sizes
        SET stock = stock + ?
        WHERE product_id = ? AND size = ?
        `,
        [items[i].quantity, items[i].product_id, items[i].size],
      );
    }

    await connection.query(
      `
      UPDATE orders
      SET status = 'cancelled'
      WHERE id = ? AND user_id = ?
      `,
      [orderId, userId],
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        order_id: Number(orderId),
        status: "cancelled",
      },
    });
  } catch (error) {
    await connection.rollback();

    return sendServerError(res, "Cannot cancel order", error);
  } finally {
    connection.release();
  }
}

module.exports = {
  getMyOrders,
  getMyOrderById,
  getMyProfile,
  updateMyProfile,
  getMyAddresses,
  createMyAddress,
  updateMyAddress,
  setDefaultMyAddress,
  deleteMyAddress,
  cancelMyOrder,
};
