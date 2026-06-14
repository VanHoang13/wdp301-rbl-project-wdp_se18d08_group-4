const express = require('express');
const ordersController = require('../controllers/orders.controller');
const orderQuotesController = require('../controllers/order_quotes.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, ordersController.listOrders);
router.post('/', requireAuth, requireRole('customer'), ordersController.createOrder);
router.get('/:id', requireAuth, ordersController.getOrder);
router.get('/:id/quotes', requireAuth, orderQuotesController.listQuotes);
router.post(
  '/:id/quotes',
  requireAuth,
  requireRole('provider'),
  orderQuotesController.submitQuote,
);
router.post(
  '/:id/quotes/:quoteId/select',
  requireAuth,
  requireRole('customer'),
  orderQuotesController.selectQuote,
);
router.post(
  '/:id/respond',
  requireAuth,
  requireRole('provider'),
  ordersController.respondToOrder,
);

module.exports = router;
