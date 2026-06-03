const { httpError, normalizePhone, publicProfile } = require('./auth.helpers');
const { supabaseAdmin } = require('./supabase.service');

/** BE-008 — GET /api/customers/me */
async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
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
  const allowed = ['full_name', 'phone', 'avatar_url', 'date_of_birth', 'gender', 'student_id', 'university'];
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
    .select('*')
    .single();

  if (error) {
    throw httpError(500, `Profile update failed: ${error.message}`, 'db_error');
  }
  return publicProfile(data);
}

const AVATAR_BUCKET = 'avatars';
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png' };

/** BE-010 — POST /api/customers/me/avatar (multipart field: avatar) */
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

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw httpError(500, `Profile update failed: ${error.message}`, 'db_error');
  }

  return publicProfile(data);
}

module.exports = { getProfile, updateProfile, uploadAvatar };
