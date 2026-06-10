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

router.patch('/:id/accept', requireAuth, requireRole('provider'), ordersController.acceptOrder);
router.patch('/:id/decline', requireAuth, requireRole('provider'), ordersController.declineOrder);
router.patch('/:id/complete', requireAuth, requireRole('provider'), ordersController.completeOrder);
router.patch('/:id/cancel', requireAuth, ordersController.cancelOrder);

module.exports = router;
