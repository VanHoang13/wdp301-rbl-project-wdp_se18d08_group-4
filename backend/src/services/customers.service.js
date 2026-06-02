const { v2: cloudinary } = require('cloudinary');
const env = require('../config/env');
const { httpError, normalizePhone } = require('./auth.helpers');
const { supabaseAdmin } = require('./supabase.service');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/** API-008 — GET /api/customers/me */
async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, email, full_name, phone, avatar_url, role, status,
      date_of_birth, gender, referral_code, last_seen_at,
      created_at, updated_at,
      customer_profiles (
        student_id, university, total_orders, total_spent,
        loyalty_points, preferred_payment_method
      )
    `)
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw httpError(404, 'Không tìm thấy profile', 'not_found');
  }

  const { customer_profiles: cp, ...profile } = data;
  const cpRow = Array.isArray(cp) ? cp[0] : cp;
  return { ...profile, ...(cpRow || {}) };
}

/** API-009 — PATCH /api/customers/me */
async function updateProfile(userId, body) {
  if (body?.email !== undefined || body?.role !== undefined) {
    throw httpError(400, 'Không được sửa email hoặc role', 'validation_error');
  }

  const { full_name, phone, student_id, university, date_of_birth, gender } = body || {};

  const profileUpdates = {};
  if (full_name !== undefined) profileUpdates.full_name = String(full_name).trim();
  if (phone !== undefined) profileUpdates.phone = normalizePhone(phone);
  if (date_of_birth !== undefined) profileUpdates.date_of_birth = date_of_birth || null;
  if (gender !== undefined) profileUpdates.gender = gender;

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);
    if (error) throw httpError(500, error.message, 'db_error');
  }

  const customerUpdates = {};
  if (student_id !== undefined) customerUpdates.student_id = student_id;
  if (university !== undefined) customerUpdates.university = university;

  if (Object.keys(customerUpdates).length > 0) {
    const { error } = await supabaseAdmin
      .from('customer_profiles')
      .upsert({ id: userId, ...customerUpdates }, { onConflict: 'id' });
    if (error) throw httpError(500, error.message, 'db_error');
  }

  if (
    Object.keys(profileUpdates).length === 0 &&
    Object.keys(customerUpdates).length === 0
  ) {
    throw httpError(400, 'Không có trường hợp lệ để cập nhật', 'validation_error');
  }

  return getProfile(userId);
}

/** API-010 — POST /api/customers/me/avatar */
async function uploadAvatar(userId, fileBuffer) {
  const avatarUrl = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'avatars',
        public_id: userId,
        overwrite: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(httpError(500, error.message, 'storage_error'));
        resolve(result.secure_url);
      },
    );
    stream.end(fileBuffer);
  });

  const { error: dbError } = await supabaseAdmin
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (dbError) throw httpError(500, dbError.message, 'db_error');

  return { avatar_url: avatarUrl };
}

module.exports = { getProfile, updateProfile, uploadAvatar };
