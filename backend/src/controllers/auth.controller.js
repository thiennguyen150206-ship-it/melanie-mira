const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const sendServerError = require("../utils/errorResponse");
const { OAuth2Client } = require("google-auth-library");

function generateEmailCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createGoogleClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 150;
const MAX_PHONE_LENGTH = 20;
const MAX_PASSWORD_LENGTH = 100;

function isTooLong(value, maxLength) {
  if (!value) {
    return false;
  }

  return String(value).length > maxLength;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^0\d{9}$/.test(phone);
}

function isValidEmailCode(code) {
  return /^\d{6}$/.test(code);
}

function createAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    },
  );
}

// POST /api/auth/register
async function registerCustomer(req, res) {
  try {
    const { full_name, email, phone, password } = req.body;

    const fullName = full_name ? full_name.trim() : "";
    const userEmail = email ? email.trim().toLowerCase() : "";
    const userPhone = phone ? phone.trim() : "";
    const userPassword = password ? String(password) : "";

    if (!fullName || !userEmail || !userPassword) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and password are required",
      });
    }

    if (!isValidEmail(userEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (userPhone && !isValidPhone(userPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must have 10 digits and start with 0",
      });
    }

    if (
      isTooLong(fullName, MAX_NAME_LENGTH) ||
      isTooLong(userEmail, MAX_EMAIL_LENGTH) ||
      isTooLong(userPhone, MAX_PHONE_LENGTH) ||
      isTooLong(userPassword, MAX_PASSWORD_LENGTH)
    ) {
      return res.status(400).json({
        success: false,
        message: "Register information is too long",
      });
    }

    if (userPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const [existingUsers] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [userEmail],
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(userPassword, 10);

    const [result] = await pool.query(
      `
      INSERT INTO users (
        full_name,
        email,
        phone,
        password_hash,
        role
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [fullName, userEmail, userPhone || null, passwordHash, "customer"],
    );

    res.status(201).json({
      success: true,
      message: "Register successfully",
      data: {
        id: result.insertId,
        full_name: fullName,
        email: userEmail,
        phone: userPhone || null,
        role: "customer",
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot register customer", error);
  }
}

// POST /api/auth/login
async function loginCustomer(req, res) {
  try {
    const { email, password } = req.body;

    const userEmail = email ? email.trim().toLowerCase() : "";
    const userPassword = password ? String(password) : "";

    if (!userEmail || !userPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!isValidEmail(userEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (
      isTooLong(userEmail, MAX_EMAIL_LENGTH) ||
      isTooLong(userPassword, MAX_PASSWORD_LENGTH)
    ) {
      return res.status(400).json({
        success: false,
        message: "Login information is too long",
      });
    }

    const [users] = await pool.query(
      `
      SELECT id, full_name, email, phone, password_hash, role
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [userEmail],
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "This account is not a customer account",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      userPassword,
      user.password_hash,
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    const token = createAuthToken(user);

    res.json({
      success: true,
      message: "Login successfully",
      data: {
        token: token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot login customer", error);
  }
}

// GET /api/auth/google
function loginWithGoogle(req, res) {
  const googleClient = createGoogleClient();

  const marketingOptIn = Number(req.query.marketing_opt_in) === 1 ? 1 : 0;

  const authUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    prompt: "select_account",
    state: marketingOptIn === 1 ? "marketing_opt_in_1" : "marketing_opt_in_0",
  });

  res.redirect(authUrl);
}

// GET /api/auth/google/callback
async function googleCallback(req, res) {
  try {
    const { code, state } = req.query;

    const marketingOptIn = state === "marketing_opt_in_1" ? 1 : 0;

    if (!code) {
      return res.redirect(
        process.env.FRONTEND_URL + "/login.html?error=google_login_failed",
      );
    }

    const googleClient = createGoogleClient();

    const { tokens } = await googleClient.getToken(code);

    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const googleUser = ticket.getPayload();
    const googleEmail = googleUser.email
      ? googleUser.email.trim().toLowerCase()
      : "";

    const googleName = googleUser.name ? googleUser.name.trim() : googleEmail;

    if (!googleEmail) {
      return res.redirect(
        process.env.FRONTEND_URL + "/login.html?error=google_email_not_found",
      );
    }

    if (
      !isValidEmail(googleEmail) ||
      isTooLong(googleEmail, MAX_EMAIL_LENGTH)
    ) {
      return res.redirect(
        process.env.FRONTEND_URL + "/login.html?error=google_email_invalid",
      );
    }

    const safeGoogleName = isTooLong(googleName, MAX_NAME_LENGTH)
      ? googleEmail
      : googleName;

    const [users] = await pool.query(
      `
     SELECT id, full_name, email, phone, role, marketing_opt_in
    FROM users
    WHERE email = ?
    LIMIT 1
      `,
      [googleEmail],
    );

    let user;

    if (users.length > 0) {
      user = users[0];

      await pool.query(
        `
    UPDATE users
    SET marketing_opt_in = ?
    WHERE id = ?
    `,
        [marketingOptIn, user.id],
      );

      user.marketing_opt_in = marketingOptIn;
    } else {
      /*
        Tạo mật khẩu giả dạng hash.
        Vì tài khoản Google không đăng nhập bằng mật khẩu thường.
      */
      const randomPasswordHash = await bcrypt.hash(
        "google_oauth_" + Date.now(),
        10,
      );

      const [result] = await pool.query(
        `
       INSERT INTO users (
  full_name,
  email,
  phone,
  password_hash,
  role,
  marketing_opt_in
)
VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          safeGoogleName,
          googleEmail,
          null,
          randomPasswordHash,
          "customer",
          marketingOptIn,
        ],
      );

      user = {
        id: result.insertId,
        full_name: safeGoogleName,
        email: googleEmail,
        phone: null,
        role: "customer",
        marketing_opt_in: marketingOptIn,
      };
    }

    if (user.role !== "customer") {
      return res.redirect(
        process.env.FRONTEND_URL + "/login.html?error=not_customer_account",
      );
    }
    const token = createAuthToken(user);
    const redirectUrl =
      process.env.FRONTEND_URL +
      "/login.html?google_login=success" +
      "&token=" +
      encodeURIComponent(token) +
      "&name=" +
      encodeURIComponent(user.full_name) +
      "&email=" +
      encodeURIComponent(user.email) +
      "&marketing_opt_in=" +
      encodeURIComponent(user.marketing_opt_in || 0);

    res.redirect(redirectUrl);
  } catch (error) {
    console.log("Google login error:", error.message);

    res.redirect(
      process.env.FRONTEND_URL + "/login.html?error=google_login_failed",
    );
  }
}

// POST /api/auth/email/start
async function startEmailLogin(req, res) {
  try {
    const { email } = req.body;

    const userEmail = email ? email.trim().toLowerCase() : "";

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!isValidEmail(userEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (isTooLong(userEmail, MAX_EMAIL_LENGTH)) {
      return res.status(400).json({
        success: false,
        message: "Email is too long",
      });
    }

    const code = generateEmailCode();
    const codeHash = await bcrypt.hash(code, 10);

    /*
      Mã hết hạn sau 10 phút.
      MySQL dùng DATE_ADD(NOW(), INTERVAL 10 MINUTE).
    */
    await pool.query(
      `
      INSERT INTO email_verification_codes (
        email,
        code_hash,
        expires_at
      )
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
      `,
      [userEmail, codeHash],
    );

    /*
      Tạm thời in mã ra terminal để test.
      Sau này gắn dịch vụ email thật thì bỏ dòng này.
    */
    console.log("=================================");
    console.log("Melanie Mira email OTP");
    console.log("Email:", userEmail);
    console.log("Code:", code);
    console.log("=================================");

    const responseData = {
      email: userEmail,
    };

    /*
  Chỉ trả dev_code khi chạy local/development.
  Khi deploy production sẽ không lộ mã OTP ra client.
*/
    if (process.env.NODE_ENV !== "production") {
      responseData.dev_code = code;
    }

    res.json({
      success: true,
      message: "Verification code sent",
      data: responseData,
    });
  } catch (error) {
    return sendServerError(res, "Cannot start email login", error);
  }
}

// POST /api/auth/email/verify
async function verifyEmailCode(req, res) {
  try {
    const { email, code } = req.body;

    const userEmail = email ? email.trim().toLowerCase() : "";
    const emailCode = code ? String(code).trim() : "";

    if (!userEmail || !emailCode) {
      return res.status(400).json({
        success: false,
        message: "Email and code are required",
      });
    }

    if (!isValidEmail(userEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (isTooLong(userEmail, MAX_EMAIL_LENGTH)) {
      return res.status(400).json({
        success: false,
        message: "Email is too long",
      });
    }

    if (!isValidEmailCode(emailCode)) {
      return res.status(400).json({
        success: false,
        message: "Verification code must have 6 digits",
      });
    }

    const [codes] = await pool.query(
      `
      SELECT id, code_hash, expires_at, used_at
      FROM email_verification_codes
      WHERE email = ?
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userEmail],
    );

    if (codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Code is expired or not found",
      });
    }

    const codeRow = codes[0];

    const isCodeCorrect = await bcrypt.compare(emailCode, codeRow.code_hash);

    if (!isCodeCorrect) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    await pool.query(
      `
      UPDATE email_verification_codes
      SET used_at = NOW()
      WHERE id = ?
      `,
      [codeRow.id],
    );

    const [users] = await pool.query(
      `
      SELECT id, full_name, email, phone, role
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [userEmail],
    );

    let user;

    if (users.length > 0) {
      user = users[0];
    } else {
      /*
        Tài khoản tạo bằng OTP không cần mật khẩu,
        nhưng bảng users đang có password_hash nên mình tạo hash giả.
      */
      const randomPasswordHash = await bcrypt.hash(
        "email_otp_" + Date.now(),
        10,
      );

      const [result] = await pool.query(
        `
        INSERT INTO users (
          full_name,
          email,
          phone,
          password_hash,
          role
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [userEmail, userEmail, null, randomPasswordHash, "customer"],
      );

      user = {
        id: result.insertId,
        full_name: userEmail,
        email: userEmail,
        phone: null,
        role: "customer",
      };
    }

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "This account is not a customer account",
      });
    }

    const token = createAuthToken(user);

    res.json({
      success: true,
      message: "Email verified successfully",
      data: {
        token: token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot verify email code", error);
  }
}

// POST /api/auth/admin/login
async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    const adminEmail = email ? String(email).trim().toLowerCase() : "";
    const adminPassword = password ? String(password) : "";

    if (!adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: "Admin email and password are required",
      });
    }

    if (!isValidEmail(adminEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin email",
      });
    }

    if (
      isTooLong(adminEmail, MAX_EMAIL_LENGTH) ||
      isTooLong(adminPassword, MAX_PASSWORD_LENGTH)
    ) {
      return res.status(400).json({
        success: false,
        message: "Admin login information is too long",
      });
    }

    const [admins] = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        password_hash,
        role,
        is_active
      FROM admin_users
      WHERE email = ?
      LIMIT 1
      `,
      [adminEmail],
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin email or password",
      });
    }

    const admin = admins[0];

    if (Number(admin.is_active) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin account is disabled",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      adminPassword,
      admin.password_hash,
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin email or password",
      });
    }

    await pool.query(
      `
      UPDATE admin_users
      SET last_login_at = NOW()
      WHERE id = ?
      `,
      [admin.id],
    );

    const token = createAuthToken({
      id: admin.id,
      email: admin.email,
      role: admin.role || "admin",
    });

    res.json({
      success: true,
      message: "Admin login successfully",
      data: {
        token: token,
        admin: {
          id: admin.id,
          full_name: admin.full_name,
          email: admin.email,
          role: admin.role || "admin",
        },
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot login admin", error);
  }
}

module.exports = {
  registerCustomer,
  loginCustomer,
  loginWithGoogle,
  googleCallback,
  startEmailLogin,
  verifyEmailCode,
  adminLogin,
};
