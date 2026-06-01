const express = require('express');
const paymentsController = require('../controllers/payments.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/deposit', requireAuth, requireRole('customer'), paymentsController.createDeposit);

module.exports = router;
