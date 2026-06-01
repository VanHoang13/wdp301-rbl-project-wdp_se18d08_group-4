/**
 * Auth API — routes đã mount tại /api/auth (xem routes/index.js).
 * Mọi handler trả 501 cho đến khi team implement auth.service.js.
 *
 * | Method | Path              | Task   | Middleware      |
 * |--------|-------------------|--------|-----------------|
 * | POST   | /register         | BE-001 | —               |
 * | POST   | /login            | BE-003 | —               |
 * | GET    | /me               | BE-003 | requireNodeAuth |
 * | POST   | /change-password  | BE-006 | requireNodeAuth |
 * | POST   | /forgot-password  | BE-007 | —               |
 * | POST   | /reset-password   | BE-007 | —               |
 */
const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth, requireNodeAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/me', requireNodeAuth, authController.me);
router.post('/change-password', requireNodeAuth, authController.changePassword);

module.exports = router;
