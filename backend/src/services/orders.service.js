const { supabaseAdmin } = require('./supabase.service');
const { createNotification } = require('./notification.service');
const { isDaNangCity, isDaNangOrder } = require('../utils/da_nang');

async function enrichOrderWithProvider(order) {
  if (!order?.provider_id) return order;

  const { data: profile } = await supabaseAdmin
    .from('provider_profiles')
    .select(
      'business_name, vehicle_type, rating, license_plate, profiles!provider_profiles_id_fkey(full_name, avatar_url)',
    )
    .eq('id', order.provider_id)
    .maybeSingle();

  const userProfile = profile?.profiles;
  const nestedProfile = Array.isArray(userProfile) ? userProfile[0] : userProfile;

  return {
    ...order,
    provider_name: profile?.business_name || nestedProfile?.full_name || null,
    provider_avatar_url: nestedProfile?.avatar_url || null,
    provider_rating: profile?.rating ?? null,
    provider_plate: profile?.license_plate || null,
  };
}

async function listOrdersForUser(userId, role, queryParams = {}) {
  let query = supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false });

  if (role === 'customer') {
    query = query.eq('customer_id', userId);
  } else if (role === 'provider') {
    query = query.or(`provider_id.eq.${userId},status.eq.pending,status.eq.matched`);
  }

  const { status } = queryParams;
  if (status) {
    const statuses = String(status)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('status', statuses);
    }
  }

  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 400 });

  if (role === 'provider') {
    const filtered = (data || []).filter((order) => {
      if (order.provider_id === userId) return true;
      if (order.status !== 'pending' && order.status !== 'matched') return false;
      return isDaNangOrder(order);
    });
    return filtered;
  }

  return Promise.all((data || []).map(enrichOrderWithProvider));
}

async function notifyDaNangProvidersNewOrder(order) {
  if (!isDaNangOrder(order)) return;

  const { data: providers, error } = await supabaseAdmin
    .from('provider_profiles')
    .select('id, service_area')
    .eq('is_verified', true)
    .eq('is_available', true);

  if (error || !providers?.length) return;

  const title = order.quote_request ? 'Yêu cầu báo giá mới tại Đà Nẵng' : 'Đơn mới tại Đà Nẵng';
  const body = order.quote_request
    ? `${order.pickup_address || 'Điểm lấy'} → ${order.delivery_address || 'Điểm giao'} — gửi báo giá ngay`
    : `${order.pickup_address || 'Điểm lấy'} → ${order.delivery_address || 'Điểm giao'}`;

  for (const p of providers) {
    const areas = Array.isArray(p.service_area) ? p.service_area : [];
    const servesDaNang = areas.length === 0 || areas.some((a) => isDaNangCity(a));
    if (!servesDaNang) continue;

    await createNotification(p.id, 'order_created', title, body, {
      actionData: { order_id: order.id },
      icon: 'truck',
    });
  }
}

async function createOrder(customerId, payload) {
  const baseRow = {
    customer_id: customerId,
    vehicle_size: payload.vehicle_size,
    service_type: payload.service_type || 'standard',
    pickup_address: payload.pickup_address,
    pickup_city: payload.pickup_city,
    pickup_district: payload.pickup_district,
    pickup_floor: payload.pickup_floor ?? 1,
    pickup_has_elevator: payload.pickup_has_elevator ?? false,
    pickup_notes: payload.pickup_notes || null,
    pickup_latitude: payload.pickup_latitude ?? null,
    pickup_longitude: payload.pickup_longitude ?? null,
    pickup_contact_name: payload.pickup_contact_name,
    pickup_contact_phone: payload.pickup_contact_phone,
    delivery_address: payload.delivery_address,
    delivery_city: payload.delivery_city,
    delivery_district: payload.delivery_district,
    delivery_floor: payload.delivery_floor ?? 1,
    delivery_has_elevator: payload.delivery_has_elevator ?? false,
    delivery_notes: payload.delivery_notes || null,
    delivery_latitude: payload.delivery_latitude ?? null,
    delivery_longitude: payload.delivery_longitude ?? null,
    delivery_contact_name: payload.delivery_contact_name,
    delivery_contact_phone: payload.delivery_contact_phone,
    base_price: payload.quote_request === true ? 0 : payload.base_price,
    distance_price: payload.quote_request === true ? 0 : payload.distance_price || 0,
    floor_price: payload.quote_request === true ? 0 : payload.floor_price || 0,
    service_fee: payload.quote_request === true ? 0 : payload.service_fee || 0,
    total_price: payload.quote_request === true ? 0 : payload.total_price,
    scheduled_pickup_time: payload.scheduled_pickup_time,
    number_of_rooms: payload.number_of_rooms || 1,
    requires_helpers: payload.requires_helpers ?? false,
    number_of_helpers: payload.number_of_helpers ?? 0,
    status: 'pending',
  };

  let insertRow = { ...baseRow, quote_request: payload.quote_request === true };
  let { data, error } = await supabaseAdmin.from('orders').insert(insertRow).select('*').single();

  if (error && /quote_request/i.test(error.message)) {
    ({ data, error } = await supabaseAdmin.from('orders').insert(baseRow).select('*').single());
  }

  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  await notifyDaNangProvidersNewOrder(data);
  return data;
}

async function providerRespond(orderId, providerId, response, declineReason) {
  const order = await getOrderById(orderId);

  if (order.quote_request && response === 'accepted') {
    const matchedAfterDeposit =
      order.provider_id === providerId &&
      order.deposit_paid === true &&
      order.status === 'matched';

    if (!matchedAfterDeposit) {
      let message = 'Đơn báo giá — hãy gửi báo giá thay vì nhận trực tiếp';
      if (order.provider_id === providerId && order.status === 'matched' && !order.deposit_paid) {
        message = 'Chờ khách đặt cọc trước khi nhận đơn';
      } else if (order.provider_id && order.provider_id !== providerId) {
        message = 'Khách đã chốt nhà xe khác';
      }
      throw Object.assign(new Error(message), { status: 400 });
    }
  }

  if (response === 'accepted' && order.provider_id && order.provider_id !== providerId) {
    throw Object.assign(new Error('Khách đã chốt nhà xe khác'), { status: 403 });
  }

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

    await createNotification(
      order.customer_id,
      'order_accepted',
      'Nhà xe đã nhận đơn',
      `${order.pickup_address || 'Điểm lấy'} → ${order.delivery_address || 'Điểm giao'}`,
      {
        actionData: { order_id: orderId },
        icon: 'check-circle',
      },
    );

    return enrichOrderWithProvider(data);
  }

  return { order_id: orderId, response };
}

async function getOrderById(orderId) {
  const { data, error } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
  if (error) throw Object.assign(new Error(error.message), { status: 404 });
  return enrichOrderWithProvider(data);
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

  await supabaseAdmin.from('order_provider_responses').insert({
    order_id: orderId,
    provider_id: providerId,
    response: 'accepted',
  });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ provider_id: providerId, status: 'in_progress' })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!data)
    throw Object.assign(new Error('Đơn hàng vừa được nhận bởi provider khác'), { status: 409 });
  return enrichOrderWithProvider(data);
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
  return enrichOrderWithProvider(data);
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
  return enrichOrderWithProvider(data);
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
