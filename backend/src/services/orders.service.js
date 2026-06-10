const { supabaseAdmin } = require('./supabase.service');

async function listOrdersForUser(userId, role) {
  let query = supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false });

  if (role === 'customer') {
    query = query.eq('customer_id', userId);
  } else if (role === 'provider') {
    query = query.or(`provider_id.eq.${userId},status.eq.pending,status.eq.matched`);
  }

  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return data;
}

async function createOrder(customerId, payload) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_id: customerId,
      vehicle_size: payload.vehicle_size,
      service_type: payload.service_type || 'standard',
      pickup_address: payload.pickup_address,
      pickup_city: payload.pickup_city,
      pickup_district: payload.pickup_district,
      pickup_contact_name: payload.pickup_contact_name,
      pickup_contact_phone: payload.pickup_contact_phone,
      delivery_address: payload.delivery_address,
      delivery_city: payload.delivery_city,
      delivery_district: payload.delivery_district,
      delivery_contact_name: payload.delivery_contact_name,
      delivery_contact_phone: payload.delivery_contact_phone,
      base_price: payload.base_price,
      distance_price: payload.distance_price || 0,
      floor_price: payload.floor_price || 0,
      service_fee: payload.service_fee || 0,
      total_price: payload.total_price,
      scheduled_pickup_time: payload.scheduled_pickup_time,
      number_of_rooms: payload.number_of_rooms || 1,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return data;
}

async function providerRespond(orderId, providerId, response, declineReason) {
  const { error: responseError } = await supabaseAdmin.from('order_provider_responses').insert({
    order_id: orderId,
    provider_id: providerId,
    response,
    decline_reason: declineReason || null,
  });

  if (responseError) throw Object.assign(new Error(responseError.message), { status: 400 });

  if (response === 'accepted') {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        provider_id: providerId,
        status: 'accepted',
        provider_accepted_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) throw Object.assign(new Error(error.message), { status: 400 });
    return data;
  }

  return { order_id: orderId, response };
}

async function getOrderById(orderId) {
  const { data, error } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
  if (error) throw Object.assign(new Error(error.message), { status: 404 });
  return data;
}

// ── PATCH /api/orders/:id/accept ──────────────────────────────────────────────
async function acceptOrder(orderId, providerId) {
  const { data: order, error: fetchErr } = await supabaseAdmin
    .from('orders')
    .select('id, status, provider_id')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchErr) throw Object.assign(new Error(fetchErr.message), { status: 500 });
  if (!order) throw Object.assign(new Error('Không tìm thấy đơn hàng'), { status: 404 });
  if (order.status !== 'pending')
    throw Object.assign(new Error('Đơn hàng không còn ở trạng thái chờ nhận'), { status: 409 });

  // Log response
  await supabaseAdmin.from('order_provider_responses').insert({
    order_id: orderId,
    provider_id: providerId,
    response: 'accepted',
  });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ provider_id: providerId, status: 'in_progress' })
    .eq('id', orderId)
    .eq('status', 'pending') // guard against race condition
    .select('*')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!data) throw Object.assign(new Error('Đơn hàng vừa được nhận bởi provider khác'), { status: 409 });
  return data;
}

// ── PATCH /api/orders/:id/decline ─────────────────────────────────────────────
async function declineOrder(orderId, providerId, reason) {
  const { data: order, error: fetchErr } = await supabaseAdmin
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchErr) throw Object.assign(new Error(fetchErr.message), { status: 500 });
  if (!order) throw Object.assign(new Error('Không tìm thấy đơn hàng'), { status: 404 });
  if (!['pending', 'in_progress'].includes(order.status))
    throw Object.assign(new Error('Không thể từ chối đơn ở trạng thái này'), { status: 409 });

  await supabaseAdmin.from('order_provider_responses').insert({
    order_id: orderId,
    provider_id: providerId,
    response: 'declined',
    decline_reason: reason || null,
  });

  return { order_id: orderId, status: order.status };
}

// ── PATCH /api/orders/:id/complete ────────────────────────────────────────────
async function completeOrder(orderId, providerId) {
  const { data: order, error: fetchErr } = await supabaseAdmin
    .from('orders')
    .select('id, status, provider_id')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchErr) throw Object.assign(new Error(fetchErr.message), { status: 500 });
  if (!order) throw Object.assign(new Error('Không tìm thấy đơn hàng'), { status: 404 });
  if (order.provider_id !== providerId)
    throw Object.assign(new Error('Bạn không phải provider của đơn hàng này'), { status: 403 });
  if (order.status !== 'in_progress')
    throw Object.assign(new Error('Chỉ có thể hoàn thành đơn đang thực hiện'), { status: 409 });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('*')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
}

// ── PATCH /api/orders/:id/cancel ──────────────────────────────────────────────
async function cancelOrder(orderId, userId, reason) {
  const { data: order, error: fetchErr } = await supabaseAdmin
    .from('orders')
    .select('id, status, customer_id, provider_id')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchErr) throw Object.assign(new Error(fetchErr.message), { status: 500 });
  if (!order) throw Object.assign(new Error('Không tìm thấy đơn hàng'), { status: 404 });
  if (order.customer_id !== userId && order.provider_id !== userId)
    throw Object.assign(new Error('Bạn không có quyền hủy đơn hàng này'), { status: 403 });
  if (['completed', 'cancelled'].includes(order.status))
    throw Object.assign(new Error('Đơn hàng đã hoàn thành hoặc đã hủy'), { status: 409 });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
      cancellation_reason: reason || null,
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
}

module.exports = {
  listOrdersForUser,
  createOrder,
  providerRespond,
  getOrderById,
  acceptOrder,
  declineOrder,
  completeOrder,
  cancelOrder,
};
