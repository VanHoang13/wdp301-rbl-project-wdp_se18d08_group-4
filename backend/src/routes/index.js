const express = require('express');
const ordersRoutes = require('./orders.routes');
const providersRoutes = require('./providers.routes');
const paymentsRoutes = require('./payments.routes');
const webhooksRoutes = require('./webhooks.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'UniMove Node.js API',
    timestamp: new Date().toISOString(),
  });
});

router.use('/orders', ordersRoutes);
router.use('/providers', providersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
