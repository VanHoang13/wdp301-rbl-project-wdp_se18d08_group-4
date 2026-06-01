/**
 * SCAFFOLD — Leader đã tạo file + export; team implement từng hàm (BE-001 → BE-007).
 *
 * Gợi ý: require('./auth.helpers'), require('../utils/password'), supabaseAdmin.
 * DB: docs/supabase/20240113000000_node_auth.sql (chạy thủ công trên Supabase).
 */
const { httpError } = require('./auth.helpers');
const { supabaseAdmin } = require('./supabase.service');

/** BE-001 — POST /api/auth/register */
async function register(_body) {
  throw httpError(501, 'BE-001: implement register() trong auth.service.js', 'not_implemented');
}

/** BE-003 — POST /api/auth/login */
async function login(_body) {
  throw httpError(501, 'BE-003: implement login() trong auth.service.js', 'not_implemented');
}

/** BE-003 — GET /api/auth/me (requireNodeAuth) */
async function getMe(_userId) {
  throw httpError(501, 'BE-003: implement getMe() trong auth.service.js', 'not_implemented');
}

/** BE-006 — POST /api/auth/change-password */
async function changePassword(_userId, _body) {
  throw httpError(501, 'BE-006: implement changePassword() trong auth.service.js', 'not_implemented');
}

/** BE-007 — POST /api/auth/forgot-password */
async function forgotPassword(_email) {
  throw httpError(501, 'BE-007: implement forgotPassword() trong auth.service.js', 'not_implemented');
}

/** BE-007 — POST /api/auth/reset-password */
async function resetPassword(_body) {
  throw httpError(501, 'BE-007: implement resetPassword() trong auth.service.js', 'not_implemented');
}

/** API-005 — POST /api/auth/logout */
async function logout(accessToken) {
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
  if (error) throw httpError(500, error.message, 'logout_error');
  return { message: 'Đăng xuất thành công' };
}

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
};
