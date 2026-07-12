const MAX_COUPON_CODE_LENGTH = 50;

function normalizeCouponCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function isValidCouponCodeFormat(code) {
  return /^[A-Z0-9_-]{2,50}$/.test(code);
}

function roundMoney(value) {
  const numberValue = Number(value || 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return Math.round(numberValue * 100) / 100;
}

function getDateTimeValue(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function calculateCouponDiscount(coupon, subtotalAmount) {
  const subtotal = roundMoney(subtotalAmount);
  const discountValue = roundMoney(coupon.discount_value);

  let discountAmount = 0;

  if (coupon.discount_type === "percent") {
    discountAmount = subtotal * (discountValue / 100);

    if (
      coupon.max_discount_amount !== null &&
      coupon.max_discount_amount !== undefined
    ) {
      discountAmount = Math.min(
        discountAmount,
        roundMoney(coupon.max_discount_amount),
      );
    }
  }

  if (coupon.discount_type === "fixed") {
    discountAmount = discountValue;
  }

  discountAmount = Math.min(discountAmount, subtotal);
  discountAmount = Math.max(discountAmount, 0);

  return roundMoney(discountAmount);
}

async function validateCouponForSubtotal(
  db,
  couponCode,
  subtotalAmount,
  options = {},
) {
  const code = normalizeCouponCode(couponCode);
  const subtotal = roundMoney(subtotalAmount);
  const forUpdate = options.forUpdate === true;

  if (!code) {
    return {
      is_valid: false,
      message: "Vui lòng nhập mã giảm giá.",
    };
  }

  if (code.length > MAX_COUPON_CODE_LENGTH || !isValidCouponCodeFormat(code)) {
    return {
      is_valid: false,
      message: "Mã giảm giá không hợp lệ.",
    };
  }

  if (subtotal <= 0) {
    return {
      is_valid: false,
      message: "Tổng đơn hàng không hợp lệ.",
    };
  }

  const [coupons] = await db.query(
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
      is_active
    FROM coupons
    WHERE code = ?
    LIMIT 1
    ${forUpdate ? "FOR UPDATE" : ""}
    `,
    [code],
  );

  if (coupons.length === 0) {
    return {
      is_valid: false,
      message: "Mã giảm giá không tồn tại.",
    };
  }

  const coupon = coupons[0];

  if (Number(coupon.is_active) !== 1) {
    return {
      is_valid: false,
      message: "Mã giảm giá đã bị tắt.",
    };
  }

  const now = Date.now();
  const startsAt = getDateTimeValue(coupon.starts_at);
  const expiresAt = getDateTimeValue(coupon.expires_at);

  if (startsAt && now < startsAt) {
    return {
      is_valid: false,
      message: "Mã giảm giá chưa đến thời gian sử dụng.",
    };
  }

  if (expiresAt && now > expiresAt) {
    return {
      is_valid: false,
      message: "Mã giảm giá đã hết hạn.",
    };
  }

  if (
    coupon.usage_limit !== null &&
    coupon.usage_limit !== undefined &&
    Number(coupon.used_count) >= Number(coupon.usage_limit)
  ) {
    return {
      is_valid: false,
      message: "Mã giảm giá đã hết lượt sử dụng.",
    };
  }

  const minOrderAmount = roundMoney(coupon.min_order_amount);

  if (subtotal < minOrderAmount) {
    return {
      is_valid: false,
      message:
        "Đơn hàng cần tối thiểu " +
        minOrderAmount.toLocaleString("vi-VN") +
        "đ để dùng mã này.",
    };
  }

  const discountAmount = calculateCouponDiscount(coupon, subtotal);
  const totalAmount = roundMoney(subtotal - discountAmount);

  if (discountAmount <= 0) {
    return {
      is_valid: false,
      message: "Mã giảm giá không tạo ra giá trị giảm hợp lệ.",
    };
  }

  return {
    is_valid: true,
    message: "Mã giảm giá hợp lệ.",
    coupon: coupon,
    subtotal_amount: subtotal,
    discount_amount: discountAmount,
    total_amount: totalAmount,
  };
}

module.exports = {
  normalizeCouponCode,
  isValidCouponCodeFormat,
  roundMoney,
  calculateCouponDiscount,
  validateCouponForSubtotal,
};
