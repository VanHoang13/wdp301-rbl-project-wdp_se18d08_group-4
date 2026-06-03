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

function shortPlaceTitle(address) {
  const parts = String(address)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[0] || address;
}

/** BE-017 — GET /api/customers/me/recent-places */
async function getRecentPlaces(userId, limitParam) {
  const limit = Math.min(Math.max(parseInt(String(limitParam || 5), 10) || 5, 1), 20);

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(
      'pickup_address, delivery_address, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude, created_at',
    )
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw httpError(500, error.message, 'db_error');
  }

  const seen = new Set();
  const places = [];

  for (const order of orders || []) {
    const candidates = [
      {
        address: order.delivery_address,
        lat: order.delivery_latitude,
        lng: order.delivery_longitude,
      },
      {
        address: order.pickup_address,
        lat: order.pickup_latitude,
        lng: order.pickup_longitude,
      },
    ];

    for (const row of candidates) {
      const address = String(row.address || '').trim();
      if (!address || seen.has(address)) continue;
      seen.add(address);

      places.push({
        title: shortPlaceTitle(address),
        address,
        lat: row.lat != null ? Number(row.lat) : null,
        lng: row.lng != null ? Number(row.lng) : null,
      });

      if (places.length >= limit) break;
    }
    if (places.length >= limit) break;
  }

  return places;
}

module.exports = { getProfile, updateProfile, getRecentPlaces };
