/**
 * Helper dùng chung khi team implement auth.service.js (BE-001 → BE-007).
 * Leader KHÔNG implement business logic — chỉ cung cấp hàm tiện ích.
 */
const { signAccessToken } = require('../utils/jwt');

function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function publicProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    role: row.role,
    status: row.status,
    student_id: row.student_id,
    university: row.university,
    created_at: row.created_at,
  };
}

function buildAuthResponse(profile) {
  const user = publicProfile(profile);
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return { user, accessToken };
}

module.exports = {
  httpError,
  normalizeEmail,
  publicProfile,
  buildAuthResponse,
};
