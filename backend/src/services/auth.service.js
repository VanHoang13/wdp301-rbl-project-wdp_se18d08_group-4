/**
 * Auth — Node JWT (register/login/me/reset-password) + quên MK qua SMTP OTP.
 * DB: docs/supabase/20240113000000_node_auth.sql
 */
const crypto = require('crypto');
const {
  httpError,
  normalizeEmail,
  normalizePhone,
  buildAuthResponse,
  publicProfile,
} = require('./auth.helpers');
const { hashPassword, verifyPassword, hashResetToken, generateResetToken } = require('../utils/password');
const { supabaseAdmin, createAnonClient } = require('./supabase.service');
const { sendPasswordResetOtp } = require('./mail.service');
const env = require('../config/env');

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

/**
 * BE-001 — POST /api/auth/register
 */
async function register(body) {
  const { email, password, full_name, phone, role: roleInput, business_name } = body || {};
  const role = roleInput === 'provider' ? 'provider' : 'customer';

  if (!email || !password || !full_name) {
    throw httpError(400, 'email, password, and full_name are required', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
    throw httpError(400, 'Invalid email format', 'validation_error');
  }

  if (String(password).length < 8) {
    throw httpError(400, 'Password must be at least 8 characters', 'validation_error');
  }

  const trimmedName = String(full_name).trim();
  if (!trimmedName) {
    throw httpError(400, 'full_name is required', 'validation_error');
  }

  let normalizedPhone = null;
  if (role === 'customer') {
    if (!phone) {
      throw httpError(400, 'phone is required for customer registration', 'validation_error');
    }
    normalizedPhone = normalizePhone(phone);
  } else {
    if (!business_name || !String(business_name).trim()) {
      throw httpError(400, 'business_name is required for provider registration', 'validation_error');
    }
    if (phone) {
      normalizedPhone = normalizePhone(phone);
    }
  }

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1);

  if (existing && existing.length > 0) {
    throw httpError(409, 'Email already registered', 'email_exists');
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: userId,
          email: normalizedEmail,
          full_name: trimmedName,
          phone: normalizedPhone,
          role,
          status: role === 'provider' ? 'pending_verification' : 'active',
        },
      ])
      .select();

    if (profileError) {
      throw httpError(500, `Profile creation failed: ${profileError.message}`, 'db_error');
    }

    const { error: credError } = await supabaseAdmin.from('user_credentials').insert([
      { user_id: userId, password_hash: passwordHash },
    ]);

    if (credError) {
      throw httpError(500, `Credential creation failed: ${credError.message}`, 'db_error');
    }

    if (role === 'provider') {
      const { error: ppError } = await supabaseAdmin.from('provider_profiles').insert([
        {
          id: userId,
          business_name: String(business_name).trim(),
          vehicle_type: 'small_truck',
          base_price: 100000,
          price_per_km: 10000,
          price_per_floor: 15000,
          is_verified: false,
        },
      ]);
      if (ppError) {
        throw httpError(500, `Provider profile creation failed: ${ppError.message}`, 'db_error');
      }
    }

    return buildAuthResponse(profile[0]);
  } catch (error) {
    if (error.status) throw error;
    throw httpError(500, error.message, 'internal_error');
  }
}



/** BE-003 — POST /api/auth/login */
async function login(body) {
  const { email, password } = body || {};

  if (!email || !password) {
    throw httpError(400, 'Email and password are required', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', normalizedEmail)
    .limit(1);

  if (profileError) {
    throw httpError(500, `Profile lookup failed: ${profileError.message}`, 'db_error');
  }

  if (!profiles || profiles.length === 0) {
    throw httpError(401, 'Invalid email or password', 'auth_failed');
  }

  const profile = profiles[0];

  const { data: credentials, error: credError } = await supabaseAdmin
    .from('user_credentials')
    .select('password_hash')
    .eq('user_id', profile.id)
    .limit(1);

  if (credError) {
    throw httpError(500, `Credential lookup failed: ${credError.message}`, 'db_error');
  }

  if (!credentials || credentials.length === 0) {
    throw httpError(401, 'Invalid email or password', 'auth_failed');
  }

  const passwordMatch = await verifyPassword(password, credentials[0].password_hash);
  if (!passwordMatch) {
    throw httpError(401, 'Invalid email or password', 'auth_failed');
  }

  return buildAuthResponse(profile);
}

/** BE-003 — GET /api/auth/me */
async function getMe(userId) {
  if (!userId) {
    throw httpError(400, 'User ID is required', 'validation_error');
  }

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .limit(1);

  if (error) {
    throw httpError(500, `Profile lookup failed: ${error.message}`, 'db_error');
  }

  if (!profiles || profiles.length === 0) {
    throw httpError(404, 'User not found', 'user_not_found');
  }

  const row = profiles[0];
  if (row.role === 'provider') {
    const { data: pp } = await supabaseAdmin
      .from('provider_profiles')
      .select('business_name, is_verified, rating')
      .eq('id', userId)
      .maybeSingle();
    return publicProfile(row, pp || undefined);
  }

  return publicProfile(row);
}



/** BE-006 — POST /api/auth/reset-password (đã đăng nhập — requireNodeAuth) */
async function resetPasswordLoggedIn(userId, body) {
  const emailInput = body?.email;
  const currentPassword = body?.current_password ?? body?.old_password ?? body?.password;
  const newPassword = body?.new_password;

  if (!userId) {
    throw httpError(400, 'User ID is required', 'validation_error');
  }

  if (!emailInput || !currentPassword || !newPassword) {
    throw httpError(400, 'email, current_password và new_password là bắt buộc', 'validation_error');
  }

  if (String(currentPassword) === String(newPassword)) {
    throw httpError(400, 'Mật khẩu mới phải khác mật khẩu hiện tại', 'validation_error');
  }

  if (String(newPassword).length < 8) {
    throw httpError(400, 'Mật khẩu mới cần ít nhất 8 ký tự', 'validation_error');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw httpError(500, profileError.message, 'db_error');
  }
  if (!profile?.email) {
    throw httpError(404, 'Không tìm thấy tài khoản', 'user_not_found');
  }

  const email = normalizeEmail(profile.email);
  const requestEmail = normalizeEmail(emailInput);

  if (requestEmail !== email) {
    throw httpError(400, 'Email không khớp tài khoản đang đăng nhập', 'validation_error');
  }

  const newPasswordHash = await hashPassword(newPassword);

  /** Tài khoản Supabase Auth (auth.users) — reauthenticate rồi admin.updateUser */
  const { data: authUserData, error: authLookupError } =
    await supabaseAdmin.auth.admin.getUserById(userId);

  if (!authLookupError && authUserData?.user) {
    const anon = createAnonClient();
    const { error: signInError } = await anon.auth.signInWithPassword({
      email,
      password: String(currentPassword),
    });

    if (signInError) {
      throw httpError(400, 'Mật khẩu hiện tại không đúng', 'invalid_password');
    }

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: String(newPassword),
    });

    if (authUpdateError) {
      throw httpError(500, authUpdateError.message, 'supabase_auth_error');
    }

    await syncUserCredentialsHash(userId, newPasswordHash);

    return { message: 'Đặt lại mật khẩu thành công.' };
  }

  /** Tài khoản chỉ Node JWT (user_credentials) */
  const { data: credentials, error: credError } = await supabaseAdmin
    .from('user_credentials')
    .select('password_hash')
    .eq('user_id', userId)
    .limit(1);

  if (credError) {
    throw httpError(500, credError.message, 'db_error');
  }

  if (!credentials?.length) {
    throw httpError(404, 'Không tìm thấy thông tin đăng nhập', 'not_found');
  }

  const passwordMatch = await verifyPassword(currentPassword, credentials[0].password_hash);
  if (!passwordMatch) {
    throw httpError(400, 'Mật khẩu hiện tại không đúng', 'invalid_password');
  }

  const { error: updateError } = await supabaseAdmin
    .from('user_credentials')
    .update({ password_hash: newPasswordHash })
    .eq('user_id', userId);

  if (updateError) {
    throw httpError(500, updateError.message, 'db_error');
  }

  return { message: 'Đặt lại mật khẩu thành công.' };
}

async function syncUserCredentialsHash(userId, passwordHash) {
  const { data: existing } = await supabaseAdmin
    .from('user_credentials')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('user_credentials')
      .update({ password_hash: passwordHash })
      .eq('user_id', userId);
  }
}

/** BE-007 — POST /api/auth/forgot-password (OTP qua SMTP) */
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
  const expiresMinutes = parseInt(String(env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 10), 10);
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

/** BE-007 — POST /api/auth/forgot-password/verify (OTP quên MK) */
async function resetPasswordViaOtp(body) {
  const { email, token, new_password } = body || {};

  if (!email || !token || !new_password) {
    throw httpError(400, 'Email, token, and new password are required', 'validation_error');
  }

  if (String(new_password).length < 8) {
    throw httpError(400, 'Password must be at least 8 characters', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1);

  if (profileError) {
    throw httpError(500, `Profile lookup failed: ${profileError.message}`, 'db_error');
  }

  if (!profiles || profiles.length === 0) {
    throw httpError(400, 'Mã xác nhận không hợp lệ hoặc đã hết hạn', 'invalid_token');
  }

  const userId = profiles[0].id;
  const tokenHash = hashResetToken(String(token).trim());

  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (tokenError) {
    throw httpError(500, `Token lookup failed: ${tokenError.message}`, 'db_error');
  }

  if (!tokens || tokens.length === 0) {
    throw httpError(400, 'Mã xác nhận không hợp lệ hoặc đã hết hạn', 'invalid_token');
  }

  const newPasswordHash = await hashPassword(new_password);

  const { error: updateError } = await supabaseAdmin
    .from('user_credentials')
    .update({ password_hash: newPasswordHash })
    .eq('user_id', userId);

  if (updateError) {
    throw httpError(500, `Password update failed: ${updateError.message}`, 'db_error');
  }

  const { error: markError } = await supabaseAdmin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokens[0].id);

  if (markError) {
    throw httpError(500, `Token update failed: ${markError.message}`, 'db_error');
  }

  return { message: 'Đặt lại mật khẩu thành công.' };
}

module.exports = {
  register,
  login,
  getMe,
  resetPasswordLoggedIn,
  forgotPassword,
  resetPasswordViaOtp,
};
