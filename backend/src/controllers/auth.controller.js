/**
 * SCAFFOLD — Chỉ gọi auth.service; không thêm logic ở đây.
 * Implement: backend/src/services/auth.service.js (BE-001 → BE-007).
 */
const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const data = await authService.register(req.body || {});
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const data = await authService.changePassword(req.user.id, req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {};
    const data = await authService.forgotPassword(email);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const data = await authService.resetPassword(req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
};
