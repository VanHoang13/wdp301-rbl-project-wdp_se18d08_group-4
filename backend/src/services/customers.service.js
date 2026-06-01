const { v2: cloudinary } = require('cloudinary');
const { supabaseAdmin } = require('./supabase.service');
const { httpError } = require('./auth.helpers');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Chuẩn hóa số điện thoại về +84 */
function normalizePhone(phone) {
  if (!phone) return phone;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('84')) return '+' + digits;
  if (digits.startsWith('0')) return '+84' + digits.slice(1);
  return '+84' + digits;
}

/** BE-008 — GET /api/customers/me */
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

  if (error || !data) throw httpError(404, 'Không tìm thấy profile', 'not_found');

  const { customer_profiles: cp, ...profile } = data;
  return { ...profile, ...(cp || {}) };
}

/** API-009 — PATCH /api/customers/me */
async function updateProfile(userId, body) {
  const { full_name, phone, student_id, university, date_of_birth, gender } = body;

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
      .update(customerUpdates)
      .eq('id', userId);
    if (error) throw httpError(500, error.message, 'db_error');
  }

  return getProfile(userId);
}

/** API-010 — POST /api/customers/me/avatar */
async function uploadAvatar(userId, fileBuffer, mimetype) {
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
