const express = require("express");
const router = express.Router();

const sepayWebhookController = require("../controllers/sepayWebhook.controller");

router.post("/sepay", sepayWebhookController.handleSePayWebhook);

module.exports = router;
