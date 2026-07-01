function sendServerError(res, message, error) {
  console.error("SERVER ERROR:", error);

  return res.status(500).json({
    success: false,
    message: message || "Server error",
  });
}

module.exports = sendServerError;
