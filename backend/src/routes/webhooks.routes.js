const express = require('express');
const paymentsController = require('../controllers/payments.controller');

const router = express.Router();

router.post('/payos', paymentsController.payosWebhook);

module.exports = router;
