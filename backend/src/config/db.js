const mysql = require("mysql2/promise");

const shouldUseSsl = process.env.DB_SSL === "true";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: shouldUseSsl
    ? {
        minVersion: "TLSv1.2",
        rejectUnauthorized: false,
      }
    : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  /*
  Giữ kết nối TCP tới database hoạt động,
  giảm việc phải tạo lại kết nối khi có request mới.
*/
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000,
});

module.exports = pool;
