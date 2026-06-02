const { supabaseAdmin } = require('./supabase.service');

async function browseProviders({ city, minRating, limit = 20 }) {
  let query = supabaseAdmin
    .from('provider_profiles')
    .select(`
      id,
      business_name,
      vehicle_type,
      base_price,
      rating,
      total_reviews,
      is_verified,
      is_available,
      profiles!provider_profiles_id_fkey(full_name, avatar_url)
    `)
    .eq('is_verified', true)
    .eq('is_available', true)
    .order('rating', { ascending: false })
    .limit(limit);

  if (minRating) query = query.gte('rating', minRating);

  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 400 });

  return data;
}

module.exports = { browseProviders };
