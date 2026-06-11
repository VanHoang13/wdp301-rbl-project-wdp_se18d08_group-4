const express = require('express');
const mapsController = require('../controllers/maps.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/places/autocomplete',
  requireAuth,
  requireRole('customer'),
  mapsController.autocomplete,
);
router.get(
  '/places/details',
  requireAuth,
  requireRole('customer'),
  mapsController.placeDetails,
);

module.exports = router;
