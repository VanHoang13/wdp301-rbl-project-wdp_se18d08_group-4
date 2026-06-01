/**
 * SCAFFOLD — Leader đã tạo file + export; team implement từng hàm (BE-001 → BE-007).
 *
 * Gợi ý: require('./auth.helpers'), require('../utils/password'), supabaseAdmin.
 * DB: docs/supabase/20240113000000_node_auth.sql (chạy thủ công trên Supabase).
 */
const env = require('../config/env');
const { httpError, normalizeEmail } = require('./auth.helpers');
const { supabaseAdmin } = require('./supabase.service');
const { sendPasswordResetOtp } = require('./mail.service');
const { generateResetToken, hashResetToken } = require('../utils/password');

function mapSupabaseAuthError(error) {
  const msg = error?.message || 'Lỗi xác thực Supabase';
  const status = error?.status === 429 ? 429 : 400;
  return httpError(status, msg, 'supabase_auth_error');
}

async function findProfileByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw httpError(500, error.message, 'db_error');
  }
  return data;
}

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

/** BE-007 — POST /api/auth/forgot-password (OTP qua SMTP của bạn, không gửi mail Supabase) */
async function forgotPassword(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) {
    throw httpError(400, 'Email không hợp lệ', 'validation_error');
  }

  const profile = await findProfileByEmail(normalized);
  if (!profile) {
    return {
      email: normalized,
      message: 'Nếu email đã đăng ký, mã xác nhận đã được gửi.',
    };
  }

  const otp = generateResetToken();
  const tokenHash = hashResetToken(otp);
  const expiresMinutes = env.passwordResetOtpExpiresMinutes;
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();

  const { error: insertError } = await supabaseAdmin.from('password_reset_tokens').insert({
    user_id: profile.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    if (insertError.code === '42P01') {
      throw httpError(
        500,
        'Bảng password_reset_tokens chưa có. Chạy migration 20240113000000_node_auth.sql trên Supabase.',
        'db_schema_missing',
      );
    }
    throw httpError(500, insertError.message, 'db_error');
  }

  try {
    await sendPasswordResetOtp({
      to: normalized,
      otp,
      expiresMinutes,
    });
  } catch (mailErr) {
    throw httpError(mailErr.status || 502, mailErr.message, mailErr.code || 'smtp_error');
  }

  return {
    email: normalized,
    message: 'Nếu email đã đăng ký, mã xác nhận đã được gửi.',
  };
}

async function consumeResetOtp(email, token) {
  const profile = await findProfileByEmail(email);
  if (!profile) {
    throw httpError(400, 'Mã xác nhận không hợp lệ hoặc đã hết hạn', 'invalid_token');
  }

  const { data: rows, error } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('id, token_hash, expires_at')
    .eq('user_id', profile.id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    throw httpError(500, error.message, 'db_error');
  }

  const tokenHash = hashResetToken(token);
  const match = (rows || []).find((row) => row.token_hash === tokenHash);
  if (!match) {
    throw httpError(400, 'Mã xác nhận không hợp lệ hoặc đã hết hạn', 'invalid_token');
  }

  await supabaseAdmin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', match.id);

  return profile;
}

/** BE-007 — POST /api/auth/reset-password
 *  - OTP (SMTP): { email, token, new_password }
 *  - Deep link JWT (tùy chọn): { token, new_password }
 */
async function resetPassword(body) {
  const token = String(body?.token || '').trim();
  const newPassword = String(body?.new_password || body?.newPassword || '');
  const email = normalizeEmail(body?.email);

  if (!token || !newPassword) {
    throw httpError(400, 'token và new_password là bắt buộc', 'validation_error');
  }
  if (newPassword.length < 8) {
    throw httpError(400, 'Mật khẩu mới cần ít nhất 8 ký tự', 'validation_error');
  }

  const isAccessToken = token.split('.').length === 3;

  if (isAccessToken) {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      throw httpError(400, 'Token không hợp lệ hoặc đã hết hạn', 'invalid_token');
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
      password: newPassword,
    });
    if (updateError) {
      throw mapSupabaseAuthError(updateError);
    }

    return { message: 'Đặt lại mật khẩu thành công.' };
  }

  if (!email) {
    throw httpError(400, 'email là bắt buộc khi dùng mã OTP', 'validation_error');
  }

  const profile = await consumeResetOtp(email, token);

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });
  if (updateError) {
    throw mapSupabaseAuthError(updateError);
  }

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
