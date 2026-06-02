const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

// Auth routes (không cần middleware)
router.post('/auth/login', adminController.login);

// Protected admin routes (Node JWT + admin role)
router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/auth/profile', adminController.getProfile);
router.get('/dashboard', adminController.getDashboard);
router.get('/dashboard/stats', adminController.getDashboardStats);

router.get('/providers/pending', adminController.getPendingProviders);
router.put('/providers/:id/verify', adminController.verifyProvider);

router.get('/disputes', adminController.getDisputes);
router.get('/disputes/:id', adminController.getDisputeDetails);
router.put('/disputes/:id/resolve', adminController.resolveDispute);

module.exports = router;
