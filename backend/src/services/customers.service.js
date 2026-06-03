const { v2: cloudinary } = require('cloudinary');
const env = require('../config/env');
const { httpError, normalizePhone } = require('./auth.helpers');
const { supabaseAdmin } = require('./supabase.service');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/** Validation helpers */
function validateFullName(fullName) {
  const trimmed = String(fullName || '').trim();
  if (!trimmed) {
    throw httpError(400, 'Tên đầy đủ không được để trống', 'validation_error');
  }
  if (trimmed.length > 255) {
    throw httpError(400, 'Tên đầy đủ không được vượt quá 255 ký tự', 'validation_error');
  }
  return trimmed;
}

function validateGender(gender) {
  const valid = ['male', 'female'];
  if (!valid.includes(String(gender || '').toLowerCase())) {
    throw httpError(400, 'Giới tính chỉ có thể là male hoặc female', 'validation_error');
  }
  return String(gender).toLowerCase();
}

function validateDateOfBirth(date) {
  if (!date) return null;
  const trimmed = String(date).trim();
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(trimmed)) {
    throw httpError(400, 'Ngày sinh phải có format YYYY-MM-DD', 'validation_error');
  }
  const dateObj = new Date(trimmed);
  if (isNaN(dateObj.getTime())) {
    throw httpError(400, 'Ngày sinh không hợp lệ', 'validation_error');
  }
  const now = new Date();
  if (dateObj > now) {
    throw httpError(400, 'Ngày sinh không thể ở trong tương lai', 'validation_error');
  }
  const age = now.getFullYear() - dateObj.getFullYear();
  if (age < 13) {
    throw httpError(400, 'Tuổi phải từ 13 tuổi trở lên', 'validation_error');
  }
  return trimmed;
}

function validateAvatarUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  try {
    new URL(trimmed);
    return trimmed;
  } catch (err) {
    throw httpError(400, 'URL avatar không hợp lệ', 'validation_error');
  }
}

function validateAddress(address) {
  if (!address) return null;
  const trimmed = String(address).trim();
  if (trimmed.length > 255) {
    throw httpError(400, 'Địa chỉ không được vượt quá 255 ký tự', 'validation_error');
  }
  return trimmed;
}

/** API-008 — GET /api/customers/me */
async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, email, full_name, phone, avatar_url, role, status,
      date_of_birth, gender, referral_code, last_seen_at,
      created_at, updated_at,
      customer_profiles (
        student_id, university, address, city, district, ward,
        total_orders, total_spent, loyalty_points, preferred_payment_method
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

  // Blacklist sensitive fields
  const blacklistedFields = ['id', 'status', 'password', 'created_at', 'updated_at', 
                             'total_orders', 'total_spent', 'loyalty_points', 'referral_code'];
  for (const field of blacklistedFields) {
    if (body?.[field] !== undefined) {
      throw httpError(400, `Không được sửa field ${field}`, 'validation_error');
    }
  }

  const {
    full_name,
    phone,
    avatar_url,
    date_of_birth,
    gender,
    student_id,
    university,
    address,
  } = body || {};

  const profileUpdates = {};
  if (full_name !== undefined) {
    profileUpdates.full_name = validateFullName(full_name);
  }
  if (phone !== undefined) {
    profileUpdates.phone = normalizePhone(phone);
  }
  if (avatar_url !== undefined) {
    profileUpdates.avatar_url = validateAvatarUrl(avatar_url);
  }
  if (date_of_birth !== undefined) {
    profileUpdates.date_of_birth = validateDateOfBirth(date_of_birth);
  }
  if (gender !== undefined) {
    profileUpdates.gender = validateGender(gender);
  }

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
  if (address !== undefined) customerUpdates.address = validateAddress(address);

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
