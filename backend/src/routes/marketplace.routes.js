const express = require('express');
const marketplaceController = require('../controllers/marketplace.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// API-059 — Khám phá tin (public, nhưng yêu cầu login)
router.get('/listings', requireAuth, marketplaceController.browseListings);

// API-060 — Tin của tôi
router.get('/my-listings', requireAuth, marketplaceController.getMyListings);

// API-062 — Đăng tin
router.post('/listings', requireAuth, marketplaceController.createListing);

module.exports = router;
