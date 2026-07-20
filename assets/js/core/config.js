/*
  Local API:
  http://localhost:5000/api

  Online API:
  https://melanie-mira-backend.onrender.com/api
*/

window.MELANIE_MIRA_CONFIG = {
  API_BASE_URL: "http://localhost:5000/api",

  /* Meta Pixel */
  META_PIXEL_ID: "1066701445752931",
  META_PIXEL_ENABLED: true,

  /*
    Để false nhằm không gửi dữ liệu localhost vào Pixel thật.
    Pixel chỉ hoạt động trên domain Melanie Mira.
  */
  META_PIXEL_ALLOW_LOCAL: false,

  PAYMENT_QR_BASE_URL: "https://vietqr.app/img",
  PAYMENT_BANK_ACCOUNT: "068617012003",
  PAYMENT_BANK_CODE: "STB",
  PAYMENT_ACCOUNT_NAME: "LE THI MINH HUYEN",
  PAYMENT_STORE_NAME: "Melanie Mira",
  PAYMENT_QR_TEMPLATE: "compact",
};
