/**
 * SCAFFOLD — Leader đã tạo file + export; team implement từng hàm (BE-001 → BE-007).
 *
 * Gợi ý: require('./auth.helpers'), require('../utils/password'), supabaseAdmin.
 * DB: docs/supabase/20240113000000_node_auth.sql (chạy thủ công trên Supabase).
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
const { supabaseAdmin } = require('./supabase.service');
const env = require('../config/env');

/**
 * BE-001 — POST /api/auth/register
 *
 * Customer: email, password, full_name, phone (role mặc định customer)
 * Provider: email, password, full_name, business_name, role=provider (phone tuỳ chọn)
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

  // Validate required fields
  if (!email || !password) {
    throw httpError(400, 'Email and password are required', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);

  // Get profile by email
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

  // Get password hash from user_credentials
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

  // Verify password
  const passwordMatch = await verifyPassword(password, credentials[0].password_hash);
  if (!passwordMatch) {
    throw httpError(401, 'Invalid email or password', 'auth_failed');
  }

  return buildAuthResponse(profile);
}

/** BE-003 — GET /api/auth/me (requireNodeAuth) */
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

/** BE-006 — POST /api/auth/change-password */
async function changePassword(userId, body) {
  const { old_password, new_password } = body || {};

  if (!userId) {
    throw httpError(400, 'User ID is required', 'validation_error');
  }

  if (!old_password || !new_password) {
    throw httpError(400, 'Old password and new password are required', 'validation_error');
  }

  if (String(new_password).length < 8) {
    throw httpError(400, 'New password must be at least 8 characters', 'validation_error');
  }

  // Get current password hash
  const { data: credentials, error: credError } = await supabaseAdmin
    .from('user_credentials')
    .select('password_hash')
    .eq('user_id', userId)
    .limit(1);

  if (credError) {
    throw httpError(500, `Credential lookup failed: ${credError.message}`, 'db_error');
  }

  if (!credentials || credentials.length === 0) {
    throw httpError(404, 'User credentials not found', 'not_found');
  }

  // Verify old password
  const passwordMatch = await verifyPassword(old_password, credentials[0].password_hash);
  if (!passwordMatch) {
    throw httpError(401, 'Old password is incorrect', 'invalid_password');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(new_password);

  // Update password
  const { error: updateError } = await supabaseAdmin
    .from('user_credentials')
    .update({ password_hash: newPasswordHash })
    .eq('user_id', userId);

  if (updateError) {
    throw httpError(500, `Password update failed: ${updateError.message}`, 'db_error');
  }

  return { success: true, message: 'Password changed successfully' };
}

/** BE-007 — POST /api/auth/forgot-password */
async function forgotPassword(email) {
  if (!email) {
    throw httpError(400, 'Email is required', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);

  // Get user by email
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1);

  if (profileError) {
    throw httpError(500, `Profile lookup failed: ${profileError.message}`, 'db_error');
  }

  // Don't reveal whether email exists
  if (!profiles || profiles.length === 0) {
    return { success: true, message: 'If email exists, password reset token will be sent' };
  }

  const userId = profiles[0].id;

  // Generate OTP token
  const token = generateResetToken();
  const tokenHash = hashResetToken(token);

  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 10));

  // Store token in database
  const { error: tokenError } = await supabaseAdmin
    .from('password_reset_tokens')
    .insert([
      {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      },
    ]);

  if (tokenError) {
    throw httpError(500, `Token creation failed: ${tokenError.message}`, 'db_error');
  }

  // In production, send email with token here
  // For now, return token for testing purposes
  return { success: true, message: 'Password reset token sent', token };
}

/** BE-007 — POST /api/auth/reset-password */
async function resetPassword(body) {
  const { email, token, new_password } = body || {};

  // Validate required fields
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
    throw httpError(401, 'Invalid email or token', 'auth_failed');
  }

  const userId = profiles[0].id;
  const tokenHash = hashResetToken(token);

  // Get valid token
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
    throw httpError(401, 'Invalid or expired token', 'invalid_token');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(new_password);

  // Update password
  const { error: updateError } = await supabaseAdmin
    .from('user_credentials')
    .update({ password_hash: newPasswordHash })
    .eq('user_id', userId);

  if (updateError) {
    throw httpError(500, `Password update failed: ${updateError.message}`, 'db_error');
  }

  // Mark token as used
  const { error: markError } = await supabaseAdmin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokens[0].id);

  if (markError) {
    throw httpError(500, `Token update failed: ${markError.message}`, 'db_error');
  }

  return { success: true, message: 'Password reset successfully' };
}

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
