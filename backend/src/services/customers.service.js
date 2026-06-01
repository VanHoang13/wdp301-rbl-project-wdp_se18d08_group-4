const { httpError, normalizePhone, publicProfile } = require('./auth.helpers');
const { supabaseAdmin } = require('./supabase.service');

/** BE-008 — GET /api/customers/me */
async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(
      'id, email, phone, full_name, avatar_url, role, status, student_id, university, loyalty_points, total_orders, rating',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw httpError(500, `Profile lookup failed: ${error.message}`, 'db_error');
  }
  if (!data) {
    throw httpError(404, 'Profile not found', 'not_found');
  }
  return publicProfile(data);
}

/** BE-009 — PATCH /api/customers/me */
async function updateProfile(userId, body) {
  const allowed = ['full_name', 'phone', 'student_id', 'university', 'date_of_birth', 'gender'];
  const patch = {};

  for (const key of allowed) {
    if (body[key] !== undefined) {
      patch[key] = body[key];
    }
  }

  if (patch.phone) {
    patch.phone = normalizePhone(patch.phone);
  }

  if (Object.keys(patch).length === 0) {
    throw httpError(400, 'No valid fields to update', 'validation_error');
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(
      'id, email, phone, full_name, avatar_url, role, status, student_id, university, loyalty_points, total_orders, rating',
    )
    .single();

  if (error) {
    throw httpError(500, `Profile update failed: ${error.message}`, 'db_error');
  }
  return publicProfile(data);
}

module.exports = { getProfile, updateProfile };
