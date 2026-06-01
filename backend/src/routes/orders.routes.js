const express = require('express');
const ordersController = require('../controllers/orders.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, ordersController.listOrders);
router.post('/', requireAuth, requireRole('customer'), ordersController.createOrder);
router.get('/:id', requireAuth, ordersController.getOrder);
router.post(
  '/:id/respond',
  requireAuth,
  requireRole('provider'),
  ordersController.respondToOrder,
);

module.exports = router;
