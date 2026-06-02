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

function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length < 9 || digits.length > 10) {
    const err = new Error('Số điện thoại không hợp lệ');
    err.status = 400;
    err.code = 'validation_error';
    throw err;
  }
  return `+84${digits}`;
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
  normalizePhone,
  publicProfile,
  buildAuthResponse,
};
