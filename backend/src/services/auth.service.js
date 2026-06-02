/**
 * SCAFFOLD — Leader đã tạo file + export; team implement từng hàm (BE-001 → BE-007).
 *
 * Password storage is handled by Supabase Auth (`auth.users.encrypted_password`).
 * Node API does not hash or persist plaintext passwords in Postgres.
 */
const { httpError, normalizeEmail, buildAuthResponse } = require('./auth.helpers');
const { hashPassword, verifyPassword, hashResetToken, generateResetToken } = require('../utils/password');
const { supabaseAdmin, supabaseAnon } = require('./supabase.service');

async function getProfileById(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .limit(1);

  if (error) {
    throw httpError(500, `Profile lookup failed: ${error.message}`, 'db_error');
  }

  return data?.[0] || null;
}

async function getProfileByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (error) {
    throw httpError(500, `Profile lookup failed: ${error.message}`, 'db_error');
  }

  return data?.[0] || null;
}

/** BE-001 — POST /api/auth/register */
async function register(body) {
  const { email, password, full_name, phone, role = 'customer' } = body || {};

  if (!email || !password || !full_name) {
    throw httpError(400, 'Email, password, and full_name are required', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail.includes('@')) {
    throw httpError(400, 'Invalid email format', 'validation_error');
  }

  if (String(password).length < 6) {
    throw httpError(400, 'Password must be at least 6 characters', 'validation_error');
  }

  const existingProfile = await getProfileByEmail(normalizedEmail);
  if (existingProfile) {
    throw httpError(409, 'Email already registered', 'email_exists');
  }

  const passwordHash = await hashPassword(password);
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
      phone: phone || null,
      role,
    },
  });

  if (authError) {
    throw httpError(400, `Registration failed: ${authError.message}`, 'auth_error');
  }

  const user = authData?.user || authData;
  if (!user?.id) {
    throw httpError(500, 'Registration failed: invalid user object', 'auth_error');
  }

  let profile = await getProfileById(user.id);
  if (!profile) {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: user.id,
          email: normalizedEmail,
          full_name,
          phone: phone || null,
          role,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw httpError(500, `Profile creation failed: ${profileError.message}`, 'db_error');
    }

    profile = profileData;
  }

  const { error: credError } = await supabaseAdmin
    .from('user_credentials')
    .upsert([
      {
        user_id: user.id,
        password_hash: passwordHash,
      },
    ], { onConflict: 'user_id' });

  if (credError) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    throw httpError(500, `Credential creation failed: ${credError.message}`, 'db_error');
  }

  return buildAuthResponse(profile);
}

/** BE-003 — POST /api/auth/login */
async function login(body) {
  const { email, password } = body || {};

  if (!email || !password) {
    throw httpError(400, 'Email and password are required', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data) {
    const message = error?.message || 'Invalid email or password';
    throw httpError(401, message, 'auth_failed');
  }

  const user = data.user || data.session?.user;
  if (!user?.id) {
    throw httpError(401, 'Invalid email or password', 'auth_failed');
  }

  const profile = await getProfileById(user.id);
  if (!profile) {
    throw httpError(404, 'User profile not found', 'not_found');
  }

  return buildAuthResponse(profile);
}

/** BE-003 — GET /api/auth/me (requireNodeAuth) */
async function getMe(userId) {
  if (!userId) {
    throw httpError(400, 'User ID is required', 'validation_error');
  }

  const profile = await getProfileById(userId);
  if (!profile) {
    throw httpError(404, 'User not found', 'not_found');
  }

  return profile;
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

  if (String(new_password).length < 6) {
    throw httpError(400, 'New password must be at least 6 characters', 'validation_error');
  }

  const profile = await getProfileById(userId);
  if (!profile) {
    throw httpError(404, 'User not found', 'not_found');
  }

  const { error: verifyError } = await supabaseAnon.auth.signInWithPassword({
    email: profile.email,
    password: old_password,
  });

  if (verifyError) {
    throw httpError(401, 'Old password is incorrect', 'auth_failed');
  }

  const newPasswordHash = await hashPassword(new_password);

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: new_password,
  });

  if (updateError) {
    throw httpError(500, `Password update failed: ${updateError.message}`, 'auth_error');
  }

  const { error: credError } = await supabaseAdmin
    .from('user_credentials')
    .upsert([
      {
        user_id: userId,
        password_hash: newPasswordHash,
      },
    ], { onConflict: 'user_id' });

  if (credError) {
    throw httpError(500, `Credential sync failed: ${credError.message}`, 'db_error');
  }

  return { success: true, message: 'Password changed successfully' };
}

/** BE-007 — POST /api/auth/forgot-password */
async function forgotPassword(email) {
  if (!email) {
    throw httpError(400, 'Email is required', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);
  const profile = await getProfileByEmail(normalizedEmail);

  if (!profile) {
    return { success: true, message: 'If email exists, password reset token will be sent' };
  }

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  const { error } = await supabaseAdmin
    .from('password_reset_tokens')
    .insert([
      {
        user_id: profile.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      },
    ]);

  if (error) {
    throw httpError(500, `Token creation failed: ${error.message}`, 'db_error');
  }

  return {
    success: true,
    message: 'Password reset token created',
    token,
  };
}

/** BE-007 — POST /api/auth/reset-password */
async function resetPassword(body) {
  const { email, token, new_password } = body || {};

  if (!email || !token || !new_password) {
    throw httpError(400, 'Email, token, and new password are required', 'validation_error');
  }

  if (String(new_password).length < 6) {
    throw httpError(400, 'Password must be at least 6 characters', 'validation_error');
  }

  const normalizedEmail = normalizeEmail(email);
  const profile = await getProfileByEmail(normalizedEmail);

  if (!profile) {
    throw httpError(401, 'Invalid email or token', 'auth_failed');
  }

  const tokenHash = hashResetToken(token);
  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('*')
    .eq('user_id', profile.id)
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

  const newPasswordHash = await hashPassword(new_password);

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: new_password,
  });

  if (updateError) {
    throw httpError(500, `Password update failed: ${updateError.message}`, 'auth_error');
  }

  const { error: credError } = await supabaseAdmin
    .from('user_credentials')
    .upsert([
      {
        user_id: profile.id,
        password_hash: newPasswordHash,
      },
    ], { onConflict: 'user_id' });

  if (credError) {
    throw httpError(500, `Credential sync failed: ${credError.message}`, 'db_error');
  }

  const { error: markError } = await supabaseAdmin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokens[0].id);

  if (markError) {
    throw httpError(500, `Token update failed: ${markError.message}`, 'db_error');
  }

  return { success: true, message: 'Password reset successfully' };
}

/** BE-008 — POST /api/auth/google — Google OAuth sign-in */
async function googleAuth(body) {
  const { id_token } = body || {};

  if (!id_token) {
    throw httpError(400, 'id_token is required', 'validation_error');
  }

  // Verify id_token with Supabase Auth
  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithIdToken({
    provider: 'google',
    token: id_token,
  });

  if (sessionError || !sessionData) {
    throw httpError(401, `Google sign-in failed: ${sessionError?.message || 'Unknown error'}`, 'auth_error');
  }

  const user = sessionData.user || sessionData.session?.user;
  if (!user?.id) {
    throw httpError(401, 'Invalid Google token', 'auth_failed');
  }

  // Profile will be auto-created by trigger if user is new
  // For existing users, just fetch the profile
  let profile = await getProfileById(user.id);

  if (!profile) {
    // Trigger should have created it, but fallback in case
    const { data: createdProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url,
          role: 'customer',
          status: 'active',
        },
      ])
      .select()
      .single();

    if (createError) {
      throw httpError(500, `Profile creation failed: ${createError.message}`, 'db_error');
    }

    profile = createdProfile;
  }

  // Update profile with avatar if available
  if (user.user_metadata?.avatar_url && !profile.avatar_url) {
    await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: user.user_metadata.avatar_url })
      .eq('id', user.id);

    profile.avatar_url = user.user_metadata.avatar_url;
  }

  return buildAuthResponse(profile);
}

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  googleAuth,
};
