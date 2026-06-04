const { httpError, normalizePhone } = require('./auth.helpers');
const { supabaseAdmin } = require('./supabase.service');

const AVATAR_BUCKET = 'avatars';
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png' };

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

/** BE-010 / API-010 — POST /api/customers/me/avatar (Supabase Storage bucket avatars) */
async function uploadAvatar(userId, file) {
  if (!file?.buffer?.length) {
    throw httpError(400, 'Thiếu file ảnh (field: avatar)', 'validation_error');
  }

  const ext = EXT_BY_MIME[file.mimetype];
  if (!ext) {
    throw httpError(400, 'Chỉ chấp nhận ảnh JPG hoặc PNG', 'invalid_file_type');
  }

  const objectPath = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) {
    if (uploadError.message?.includes('Bucket not found')) {
      throw httpError(
        500,
        'Chưa có bucket avatars trên Supabase. Chạy migration 20240114000000_avatars_storage.sql.',
        'storage_bucket_missing',
      );
    }
    throw httpError(500, uploadError.message, 'storage_error');
  }

  const { data: urlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
  const avatarUrl = urlData?.publicUrl;
  if (!avatarUrl) {
    throw httpError(500, 'Không tạo được URL ảnh', 'storage_error');
  }

  const { error: dbError } = await supabaseAdmin
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (dbError) throw httpError(500, dbError.message, 'db_error');

  return getProfile(userId);
}

module.exports = { getProfile, updateProfile, uploadAvatar };
