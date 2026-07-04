const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const pool = require("./config/db");
const sendServerError = require("./utils/errorResponse");

const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const authRoutes = require("./routes/auth.routes");
const myRoutes = require("./routes/my.routes");

const { apiLimiter } = require("./middlewares/rateLimiter");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_ALT,
].filter(Boolean);
app.use(
  cors({
    origin: function (origin, callback) {
      /*
        Cho phép request không có origin như Thunder Client/Postman.
        Browser thật sẽ có origin và bị kiểm tra.
      */
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const corsError = new Error("CORS origin not allowed");
      corsError.statusCode = 403;
      return callback(corsError);
    },
    credentials: true,
  }),
);
app.use(helmet());

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// Bắt lỗi body quá lớn hoặc JSON sai cú pháp
app.use(function (error, req, res, next) {
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large",
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body",
    });
  }

  next(error);
});

app.get("/", function (req, res) {
  res.send("Melanie Mira Backend is running");
});

// Giới hạn request cho tất cả route bắt đầu bằng /api
app.use("/api", apiLimiter);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/my", myRoutes);

app.use("/api/auth", function (req, res) {
  return res.status(405).json({
    success: false,
    message: "Method not allowed",
  });
});

app.use("/api/products", function (req, res) {
  return res.status(405).json({
    success: false,
    message: "Method not allowed",
  });
});

app.use("/api/orders", function (req, res) {
  return res.status(405).json({
    success: false,
    message: "Method not allowed",
  });
});

app.use("/api/my", function (req, res) {
  return res.status(405).json({
    success: false,
    message: "Method not allowed",
  });
});

app.get("/api/health", function (req, res) {
  res.json({
    success: true,
    message: "Server is OK",
  });
});

if (process.env.NODE_ENV !== "production") {
  app.get("/api/db-test", async function (req, res) {
    try {
      const [rows] = await pool.query("SELECT 1 + 1 AS result");

      res.json({
        success: true,
        message: "Database connected successfully",
        data: rows[0],
      });
    } catch (error) {
      return sendServerError(res, "Database connection failed", error);
    }
  });
}

// API không tồn tại
app.use("/api", function (req, res) {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Lỗi server cuối cùng
app.use(function (error, req, res, next) {
  if (error.statusCode === 403) {
    return res.status(403).json({
      success: false,
      message: "CORS origin not allowed",
    });
  }

  return sendServerError(res, "Server error", error);
});

module.exports = app;
