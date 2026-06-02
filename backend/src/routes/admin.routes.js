const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/stats/count', adminController.getCount);
router.get('/disputes/open', adminController.getOpenDisputes);
router.get('/providers/pending', adminController.getPendingProviders);

module.exports = router;
