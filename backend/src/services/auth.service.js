/**
 * SCAFFOLD — Leader đã tạo file + export; team implement từng hàm (BE-001 → BE-007).
 *
 * Gợi ý: require('./auth.helpers'), require('../utils/password'), supabaseAdmin.
 * DB: docs/supabase/20240113000000_node_auth.sql (chạy thủ công trên Supabase).
 */
const crypto = require('crypto');
const { httpError, normalizeEmail, normalizePhone, buildAuthResponse } = require('./auth.helpers');
const {
  hashPassword,
  verifyPassword,
  hashResetToken,
  generateResetToken,
} = require('../utils/password');
const { supabaseAdmin } = require('./supabase.service');
const { sendPasswordResetOtp } = require('./mail.service');
const env = require('../config/env');

async function findProfileByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw httpError(500, error.message, 'db_error');
  return data;
}

/** BE-001 — POST /api/auth/register (customer) */
async function register(body) {
  const { email, password, full_name, phone } = body || {};

  if (!email || !password || !full_name || !phone) {
    throw httpError(400, 'email, password, full_name, phone là bắt buộc', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail.includes('@')) {
    throw httpError(400, 'Email không hợp lệ', 'validation_error');
  }

  if (String(password).length < 8) {
    throw httpError(400, 'Mật khẩu cần ít nhất 8 ký tự', 'validation_error');
  }

  const trimmedName = String(full_name).trim();
  if (!trimmedName) {
    throw httpError(400, 'full_name là bắt buộc', 'validation_error');
  }

  const normalizedPhone = normalizePhone(phone);

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1);

  if (existing?.length) {
    throw httpError(409, 'Email đã được đăng ký', 'email_exists');
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([
      {
        id: userId,
        email: normalizedEmail,
        full_name: trimmedName,
        phone: normalizedPhone,
        role: 'customer',
        status: 'active',
      },
    ])
    .select();

  if (profileError) {
    throw httpError(500, profileError.message, 'db_error');
  }

  const { error: credError } = await supabaseAdmin
    .from('user_credentials')
    .insert([{ user_id: userId, password_hash: passwordHash }]);

  if (credError) {
    throw httpError(500, credError.message, 'db_error');
  }

  return buildAuthResponse(profile[0]);
}

/** BE-003 — POST /api/auth/login */
async function login(body) {
  const { email, password } = body || {};

  if (!email || !password) {
    throw httpError(400, 'Email và password là bắt buộc', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', normalizedEmail)
    .limit(1);

  if (profileError) {
    throw httpError(500, profileError.message, 'db_error');
  }

  if (!profiles?.length) {
    throw httpError(401, 'Email hoặc mật khẩu không đúng', 'auth_failed');
  }

  const profile = profiles[0];

  const { data: credentials, error: credError } = await supabaseAdmin
    .from('user_credentials')
    .select('password_hash')
    .eq('user_id', profile.id)
    .limit(1);

  if (credError) {
    throw httpError(500, credError.message, 'db_error');
  }

  if (!credentials?.length) {
    throw httpError(401, 'Email hoặc mật khẩu không đúng', 'auth_failed');
  }

  const passwordMatch = await verifyPassword(password, credentials[0].password_hash);
  if (!passwordMatch) {
    throw httpError(401, 'Email hoặc mật khẩu không đúng', 'auth_failed');
  }

  return buildAuthResponse(profile);
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
async function forgotPassword(email) {
  const normalized = normalizeEmail(email);
  if (!normalized?.includes('@')) {
    throw httpError(400, 'Email không hợp lệ', 'validation_error');
  }

  const profile = await findProfileByEmail(normalized);
  if (!profile) {
    return { email: normalized, message: 'Nếu email đã đăng ký, mã OTP đã được gửi.' };
  }

  const otp = generateResetToken();
  const expiresMinutes = env.passwordResetOtpExpiresMinutes;
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();

  const { error: insertError } = await supabaseAdmin.from('password_reset_tokens').insert({
    user_id: profile.id,
    token_hash: hashResetToken(otp),
    expires_at: expiresAt,
  });

  if (insertError) {
    if (insertError.code === '42P01') {
      throw httpError(500, 'Chưa có bảng password_reset_tokens. Chạy migration node_auth trên Supabase.', 'db_schema_missing');
    }
    throw httpError(500, insertError.message, 'db_error');
  }

  try {
    await sendPasswordResetOtp({ to: normalized, otp, expiresMinutes });
  } catch (mailErr) {
    throw httpError(mailErr.status || 502, mailErr.message, mailErr.code || 'smtp_error');
  }

  return { email: normalized, message: 'Nếu email đã đăng ký, mã OTP đã được gửi.' };
}

/** BE-007 — POST /api/auth/reset-password — email + token/otp + new_password */
async function resetPassword(body) {
  const email = normalizeEmail(body?.email);
  const otp = String(body?.token ?? body?.otp ?? body?.OTP ?? '').trim();
  const newPassword = body?.new_password ?? body?.newPassword;

  if (!email || !otp || !newPassword) {
    throw httpError(400, 'email, token (mã OTP) và new_password là bắt buộc', 'validation_error');
  }
  if (String(newPassword).length < 8) {
    throw httpError(400, 'Mật khẩu mới cần ít nhất 8 ký tự', 'validation_error');
  }

  const profile = await findProfileByEmail(email);
  if (!profile) {
    throw httpError(400, 'Mã OTP không hợp lệ hoặc đã hết hạn', 'invalid_token');
  }

  const { data: rows, error: tokenError } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('id')
    .eq('user_id', profile.id)
    .eq('token_hash', hashResetToken(otp))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (tokenError) throw httpError(500, tokenError.message, 'db_error');
  if (!rows?.length) {
    throw httpError(400, 'Mã OTP không hợp lệ hoặc đã hết hạn', 'invalid_token');
  }

  const newPasswordHash = await hashPassword(newPassword);
  const userId = profile.id;

  const { data: existingCred } = await supabaseAdmin
    .from('user_credentials')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingCred) {
    const { error } = await supabaseAdmin
      .from('user_credentials')
      .update({ password_hash: newPasswordHash })
      .eq('user_id', userId);
    if (error) throw httpError(500, error.message, 'db_error');
  } else {
    const { error } = await supabaseAdmin
      .from('user_credentials')
      .insert({ user_id: userId, password_hash: newPasswordHash });
    if (error) throw httpError(500, error.message, 'db_error');
  }

  await supabaseAdmin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', rows[0].id);

  return { message: 'Đặt lại mật khẩu thành công.' };
}

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
