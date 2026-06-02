/**
 * BE-008 → BE-010 — Customer profile API.
 */
const { httpError } = require('./auth.helpers');
const { supabaseAdmin } = require('./supabase.service');

/** Map row — cột thiếu trên Supabase trả null/0 (tránh lỗi SELECT cột không tồn tại). */
function mapCustomerProfile(row) {
  const loyaltyPoints = row.loyalty_points ?? 0;
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone ?? null,
    avatar_url: row.avatar_url ?? null,
    student_id: row.student_id ?? null,
    university: row.university ?? null,
    loyalty_points: loyaltyPoints,
    total_orders: row.total_orders ?? 0,
    total_spent: Number(row.total_spent ?? 0),
    rating: Number(row.rating ?? 0),
    date_of_birth: row.date_of_birth ?? null,
    gender: row.gender ?? null,
    wallet: loyaltyPoints,
  };
}

/** BE-008 — GET /api/customers/me (read-only) */
async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
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
