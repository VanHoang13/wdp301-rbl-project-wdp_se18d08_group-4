const express = require('express');
const marketplaceController = require('../controllers/marketplace.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// ── Batch 1 ──────────────────────────────────────────────────────────────────
// API-059 — Khám phá tin
router.get('/listings', requireAuth, marketplaceController.browseListings);
// API-060 — Tin của tôi
router.get('/my-listings', requireAuth, marketplaceController.getMyListings);
// API-062 — Đăng tin
router.post('/listings', requireAuth, marketplaceController.createListing);

// ── Batch 2 ──────────────────────────────────────────────────────────────────
// API-061 — Chi tiết tin
router.get('/listings/:id', requireAuth, marketplaceController.getListing);
// API-064 — Đổi trạng thái tin
router.patch('/listings/:id/status', requireAuth, marketplaceController.updateListingStatus);
// API-065 — Quan tâm tin
router.post('/listings/:id/interest', requireAuth, marketplaceController.expressInterest);
// API-065b — Bỏ quan tâm
router.delete('/listings/:id/interest', requireAuth, marketplaceController.removeInterest);

// ── Batch 5 ──────────────────────────────────────────────────────────────────
// Tin tôi đã quan tâm (Yêu thích)
router.get('/my-interests', requireAuth, marketplaceController.getMyInterests);

// ── Batch 3 ──────────────────────────────────────────────────────────────────
// API-066 — DS khách quan tâm
router.get('/listings/:id/interests', requireAuth, marketplaceController.getInterestedBuyers);
// API-067 — Đọc chat
router.get('/listings/:listingId/conversations/:buyerId/messages', requireAuth, marketplaceController.getMessages);
// API-068 — Gửi chat
router.post('/listings/:listingId/conversations/:buyerId/messages', requireAuth, marketplaceController.sendMessage);

// ── Batch 4 ──────────────────────────────────────────────────────────────────
// API-069 — Chốt đơn
router.post('/listings/:listingId/conversations/:buyerId/deal', requireAuth, marketplaceController.confirmDeal);
// API-070 — Huỷ chốt
router.delete('/listings/:listingId/deal', requireAuth, marketplaceController.cancelDeal);
// API-071 — Buyer đã đặt xe
router.post('/listings/:listingId/transport-booked', requireAuth, marketplaceController.markTransportBooked);

module.exports = router;
