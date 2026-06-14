const { supabaseAdmin } = require('./supabase.service');

function httpError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

// ── GET /api/providers/me/reviews ─────────────────────────────────────────────
async function getProviderReviews(providerId) {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select(`
      id, rating, title, comment, tags, images,
      service_quality_rating, punctuality_rating,
      professionalism_rating, value_for_money_rating,
      provider_response, provider_responded_at,
      created_at,
      orders (order_number),
      profiles!reviews_customer_id_fkey (full_name)
    `)
    .eq('provider_id', providerId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw httpError(500, error.message, 'db_error');

  return (data || []).map((r) => ({
    id: r.id,
    order_number: r.orders?.order_number ?? '—',
    customer_name: r.profiles?.full_name ?? 'Khách hàng',
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    tags: r.tags ?? [],
    service_quality: r.service_quality_rating,
    punctuality: r.punctuality_rating,
    professionalism: r.professionalism_rating,
    value_for_money: r.value_for_money_rating,
    provider_response: r.provider_response,
    provider_responded_at: r.provider_responded_at,
    created_at: r.created_at,
  }));
}

// ── PATCH /api/reviews/:id/respond ────────────────────────────────────────────
async function respondToReview(reviewId, providerId, response) {
  if (!response || !response.trim())
    throw httpError(400, 'Nội dung phản hồi không được để trống', 'validation_error');

  const { data: review, error: fetchErr } = await supabaseAdmin
    .from('reviews')
    .select('id, provider_id')
    .eq('id', reviewId)
    .maybeSingle();

  if (fetchErr) throw httpError(500, fetchErr.message, 'db_error');
  if (!review) throw httpError(404, 'Không tìm thấy đánh giá', 'not_found');
  if (review.provider_id !== providerId)
    throw httpError(403, 'Bạn không có quyền phản hồi đánh giá này', 'forbidden');

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .update({
      provider_response: response.trim(),
      provider_responded_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select('id, provider_response, provider_responded_at')
    .single();

  if (error) throw httpError(500, error.message, 'db_error');
  return data;
}

module.exports = { getProviderReviews, respondToReview };
