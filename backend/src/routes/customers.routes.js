/**
 * Customer profile API — /api/customers (BE-008 → BE-010).
 */
const express = require('express');
const customersController = require('../controllers/customers.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', requireAuth, requireRole('customer'), customersController.getMe);
router.patch('/me', requireAuth, requireRole('customer'), customersController.patchMe);

module.exports = router;
