const pool = require("../config/db");
const sendServerError = require("../utils/errorResponse");
const parsePositiveInt = require("../utils/parseId");

const {
  normalizeCouponCode,
  isValidCouponCodeFormat,
  roundMoney,
  validateCouponForSubtotal,
} = require("../utils/couponCalculator");

const MAX_COUPON_NAME_LENGTH = 100;
const MAX_COUPON_CODE_LENGTH = 50;

function isTooLong(value, maxLength) {
  if (!value) {
    return false;
  }

  return String(value).length > maxLength;
}

function normalizeDateTime(value) {
  if (!value) {
    return null;
  }

  let text = String(value).trim();

  if (!text) {
    return null;
  }

  text = text.replace("T", " ");

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
    return text + ":00";
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
    return text;
  }

  return "INVALID_DATE";
}

function buildCouponResponse(coupon) {
  return {
    id: Number(coupon.id),
    code: coupon.code,
    name: coupon.name,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    max_discount_amount:
      coupon.max_discount_amount === null
        ? null
        : Number(coupon.max_discount_amount),
    min_order_amount: Number(coupon.min_order_amount || 0),
    usage_limit:
      coupon.usage_limit === null ? null : Number(coupon.usage_limit),
    used_count: Number(coupon.used_count || 0),
    starts_at: coupon.starts_at,
    expires_at: coupon.expires_at,
    is_active: Number(coupon.is_active),
    created_at: coupon.created_at,
    updated_at: coupon.updated_at,
  };
}

function getCouponPayload(body) {
  const code = normalizeCouponCode(body.code);
  const name = body.name ? String(body.name).trim() : null;
  const discountType = String(body.discount_type || "").trim();
  const discountValue = Number(body.discount_value);
  const maxDiscountAmount =
    body.max_discount_amount === "" ||
    body.max_discount_amount === null ||
    body.max_discount_amount === undefined
      ? null
      : Number(body.max_discount_amount);

  const minOrderAmount =
    body.min_order_amount === "" ||
    body.min_order_amount === null ||
    body.min_order_amount === undefined
      ? 0
      : Number(body.min_order_amount);

  const usageLimit =
    body.usage_limit === "" ||
    body.usage_limit === null ||
    body.usage_limit === undefined
      ? null
      : Number(body.usage_limit);

  const startsAt = normalizeDateTime(body.starts_at);
  const expiresAt = normalizeDateTime(body.expires_at);
  const isActive = Number(body.is_active) === 0 ? 0 : 1;

  return {
    code,
    name,
    discountType,
    discountValue,
    maxDiscountAmount,
    minOrderAmount,
    usageLimit,
    startsAt,
    expiresAt,
    isActive,
  };
}

function validateCouponPayload(data) {
  if (!data.code) {
    return "Vui lòng nhập mã giảm giá.";
  }

  if (
    data.code.length > MAX_COUPON_CODE_LENGTH ||
    !isValidCouponCodeFormat(data.code)
  ) {
    return "Mã giảm giá chỉ được dùng chữ in hoa, số, dấu gạch dưới hoặc gạch ngang.";
  }

  if (isTooLong(data.name, MAX_COUPON_NAME_LENGTH)) {
    return "Tên mã giảm giá quá dài.";
  }

  if (!["percent", "fixed"].includes(data.discountType)) {
    return "Loại giảm giá không hợp lệ.";
  }

  if (
    Number.isNaN(data.discountValue) ||
    data.discountValue <= 0 ||
    data.discountValue > 999999999
  ) {
    return "Giá trị giảm giá không hợp lệ.";
  }

  if (data.discountType === "percent" && data.discountValue > 100) {
    return "Mã giảm theo phần trăm không được vượt quá 100%.";
  }

  if (
    data.maxDiscountAmount !== null &&
    (Number.isNaN(data.maxDiscountAmount) || data.maxDiscountAmount < 0)
  ) {
    return "Giảm tối đa không hợp lệ.";
  }

  if (Number.isNaN(data.minOrderAmount) || data.minOrderAmount < 0) {
    return "Giá trị đơn tối thiểu không hợp lệ.";
  }

  if (
    data.usageLimit !== null &&
    (!Number.isInteger(data.usageLimit) || data.usageLimit <= 0)
  ) {
    return "Giới hạn lượt dùng phải là số nguyên lớn hơn 0.";
  }

  if (data.startsAt === "INVALID_DATE" || data.expiresAt === "INVALID_DATE") {
    return "Thời gian mã giảm giá không hợp lệ.";
  }

  if (data.startsAt && data.expiresAt) {
    const startsAtTime = new Date(data.startsAt).getTime();
    const expiresAtTime = new Date(data.expiresAt).getTime();

    if (
      !Number.isNaN(startsAtTime) &&
      !Number.isNaN(expiresAtTime) &&
      expiresAtTime <= startsAtTime
    ) {
      return "Ngày hết hạn phải sau ngày bắt đầu.";
    }
  }

  return "";
}

// POST /api/coupons/validate
async function validateCoupon(req, res) {
  try {
    const couponCode = req.body.code;
    const subtotalAmount = Number(req.body.subtotal_amount);

    if (Number.isNaN(subtotalAmount) || subtotalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Tổng đơn hàng không hợp lệ.",
      });
    }

    const validation = await validateCouponForSubtotal(
      pool,
      couponCode,
      subtotalAmount,
    );

    if (!validation.is_valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const coupon = validation.coupon;

    res.json({
      success: true,
      message: validation.message,
      data: {
        coupon_id: Number(coupon.id),
        coupon_code: coupon.code,
        coupon_name: coupon.name,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        max_discount_amount:
          coupon.max_discount_amount === null
            ? null
            : Number(coupon.max_discount_amount),
        min_order_amount: Number(coupon.min_order_amount || 0),
        subtotal_amount: validation.subtotal_amount,
        discount_amount: validation.discount_amount,
        total_amount: validation.total_amount,
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot validate coupon", error);
  }
}

// GET /api/coupons/admin
async function getAdminCoupons(req, res) {
  try {
    const [coupons] = await pool.query(
      `
      SELECT
        id,
        code,
        name,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        usage_limit,
        used_count,
        starts_at,
        expires_at,
        is_active,
        created_at,
        updated_at
      FROM coupons
      ORDER BY created_at DESC, id DESC
      `,
    );

    res.json({
      success: true,
      count: coupons.length,
      data: coupons.map(buildCouponResponse),
    });
  } catch (error) {
    return sendServerError(res, "Cannot get coupons", error);
  }
}

// POST /api/coupons/admin
async function createAdminCoupon(req, res) {
  try {
    const data = getCouponPayload(req.body);
    const validationMessage = validateCouponPayload(data);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO coupons (
        code,
        name,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        usage_limit,
        starts_at,
        expires_at,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.code,
        data.name,
        data.discountType,
        data.discountValue,
        data.maxDiscountAmount,
        data.minOrderAmount,
        data.usageLimit,
        data.startsAt,
        data.expiresAt,
        data.isActive,
      ],
    );

    const [coupons] = await pool.query(
      `
      SELECT *
      FROM coupons
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId],
    );

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: buildCouponResponse(coupons[0]),
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Mã giảm giá đã tồn tại.",
      });
    }

    return sendServerError(res, "Cannot create coupon", error);
  }
}

// PATCH /api/coupons/admin/:id
async function updateAdminCoupon(req, res) {
  try {
    const couponId = parsePositiveInt(req.params.id);

    if (!couponId) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon id",
      });
    }

    const data = getCouponPayload(req.body);
    const validationMessage = validateCouponPayload(data);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const [oldCoupons] = await pool.query(
      `
      SELECT id
      FROM coupons
      WHERE id = ?
      LIMIT 1
      `,
      [couponId],
    );

    if (oldCoupons.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    await pool.query(
      `
      UPDATE coupons
      SET
        code = ?,
        name = ?,
        discount_type = ?,
        discount_value = ?,
        max_discount_amount = ?,
        min_order_amount = ?,
        usage_limit = ?,
        starts_at = ?,
        expires_at = ?,
        is_active = ?
      WHERE id = ?
      `,
      [
        data.code,
        data.name,
        data.discountType,
        data.discountValue,
        data.maxDiscountAmount,
        data.minOrderAmount,
        data.usageLimit,
        data.startsAt,
        data.expiresAt,
        data.isActive,
        couponId,
      ],
    );

    const [coupons] = await pool.query(
      `
      SELECT *
      FROM coupons
      WHERE id = ?
      LIMIT 1
      `,
      [couponId],
    );

    res.json({
      success: true,
      message: "Coupon updated successfully",
      data: buildCouponResponse(coupons[0]),
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Mã giảm giá đã tồn tại.",
      });
    }

    return sendServerError(res, "Cannot update coupon", error);
  }
}

// PATCH /api/coupons/admin/:id/status
async function updateAdminCouponStatus(req, res) {
  try {
    const couponId = parsePositiveInt(req.params.id);

    if (!couponId) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon id",
      });
    }

    const isActive = Number(req.body.is_active) === 1 ? 1 : 0;

    const [coupons] = await pool.query(
      `
      SELECT id
      FROM coupons
      WHERE id = ?
      LIMIT 1
      `,
      [couponId],
    );

    if (coupons.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    await pool.query(
      `
      UPDATE coupons
      SET is_active = ?
      WHERE id = ?
      `,
      [isActive, couponId],
    );

    res.json({
      success: true,
      message: "Coupon status updated successfully",
      data: {
        id: couponId,
        is_active: isActive,
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot update coupon status", error);
  }
}

module.exports = {
  validateCoupon,
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  updateAdminCouponStatus,
};
