/**
 * BE-008 → BE-010 — Customer profile API.
 */
const { httpError } = require('./auth.helpers');
const { supabaseAdmin } = require('./supabase.service');

const CUSTOMER_PROFILE_COLUMNS = [
  'id',
  'full_name',
  'email',
  'phone',
  'avatar_url',
  'student_id',
  'university',
  'loyalty_points',
  'total_orders',
  'total_spent',
  'rating',
  'date_of_birth',
  'gender',
  'role',
].join(', ');

function mapCustomerProfile(row) {
  const loyaltyPoints = row.loyalty_points ?? 0;
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    avatar_url: row.avatar_url,
    student_id: row.student_id,
    university: row.university,
    loyalty_points: loyaltyPoints,
    total_orders: row.total_orders ?? 0,
    total_spent: Number(row.total_spent ?? 0),
    rating: Number(row.rating ?? 0),
    date_of_birth: row.date_of_birth,
    gender: row.gender,
    wallet: loyaltyPoints,
  };
}

/** BE-008 — GET /api/customers/me (read-only) */
async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(CUSTOMER_PROFILE_COLUMNS)
    .eq('id', userId)
    .eq('role', 'customer')
    .maybeSingle();

  if (error) {
    throw httpError(500, error.message, 'db_error');
  }
  if (!data) {
    throw httpError(404, 'Không tìm thấy hồ sơ khách hàng', 'profile_not_found');
  }

  return mapCustomerProfile(data);
}

/** BE-009 — PATCH /api/customers/me */
async function updateProfile(_userId, _body) {
  throw httpError(501, 'BE-009: implement updateProfile() trong customers.service.js', 'not_implemented');
}

module.exports = { getProfile, updateProfile };
