const express = require('express');
const providersController = require('../controllers/providers.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/browse', providersController.browse);

// /me routes must be before /:id to avoid Express matching "me" as an id
router.get('/me/earnings', requireAuth, requireRole('provider'), providersController.getEarnings);
router.get('/me/schedule', requireAuth, requireRole('provider'), providersController.getSchedule);
router.patch('/me/schedule', requireAuth, requireRole('provider'), providersController.updateSchedule);

router.get(
  '/:id',
  requireAuth,
  requireRole('customer'),
  providersController.getById,
);

module.exports = router;
