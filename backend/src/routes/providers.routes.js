const express = require('express');
const providersController = require('../controllers/providers.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/browse', providersController.browse);
router.get(
  '/:id',
  requireAuth,
  requireRole('customer'),
  providersController.getById,
);

module.exports = router;
