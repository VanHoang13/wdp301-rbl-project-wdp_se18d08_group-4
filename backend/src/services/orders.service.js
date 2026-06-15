const { supabaseAdmin } = require('./supabase.service');
const { httpError } = require('./auth.helpers');
const { createNotification } = require('./notification.service');
const paymentsService = require('./payments.service');
const { isDaNangCity, isDaNangOrder } = require('../utils/da_nang');

const CANCELLABLE_STATUSES = ['pending', 'accepted'];

const DELIVERY_PHOTOS_BUCKET = 'delivery-photos';
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

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
    // Lấy danh sách đơn provider đã từ chối để loại ra khỏi kết quả
    const { data: declined } = await supabaseAdmin
      .from('order_provider_responses')
      .select('order_id')
      .eq('provider_id', userId)
      .eq('response', 'declined');

    const declinedIds = (declined || []).map((r) => r.order_id);

    query = query.or(`provider_id.eq.${userId},status.eq.pending,status.eq.matched`);

    if (declinedIds.length > 0) {
      query = query.not('id', 'in', `(${declinedIds.join(',')})`);
    }
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
    .update({ provider_id: providerId, status: 'accepted' })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!data)
    throw Object.assign(new Error('Đơn hàng vừa được nhận bởi provider khác'), { status: 409 });
  return enrichOrderWithProvider(data);
}

// ── PATCH /api/orders/:id/start ───────────────────────────────────────────────
async function startOrder(orderId, providerId) {
  const { data: order, error: fetchErr } = await supabaseAdmin
    .from('orders')
    .select('id, status, provider_id')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchErr) throw Object.assign(new Error(fetchErr.message), { status: 500 });
  if (!order) throw Object.assign(new Error('Không tìm thấy đơn hàng'), { status: 404 });
  if (order.provider_id !== providerId)
    throw Object.assign(new Error('Bạn không phải provider của đơn hàng này'), { status: 403 });
  if (order.status !== 'accepted')
    throw Object.assign(new Error('Chỉ có thể bắt đầu đơn đã được nhận'), { status: 409 });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status: 'in_progress', actual_pickup_time: new Date().toISOString() })
    .eq('id', orderId)
    .select('*')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
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
  if (order.status !== 'pending')
    throw Object.assign(new Error('Chỉ có thể từ chối đơn đang chờ nhận'), { status: 409 });

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

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'completed',
      completed_at: now,
      payment_released: true,
      payment_released_at: now,
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await supabaseAdmin
    .from('payments')
    .update({ escrow_status: 'released' })
    .eq('order_id', orderId)
    .eq('escrow_status', 'held');

  return enrichOrderWithProvider(data);
}

/**
 * BE-025 — PATCH /api/orders/:id/cancel
 * Khách hủy → tự tạo yêu cầu hoàn tiền pending (nếu có payment).
 * Provider hủy → hủy đơn đơn giản (không refund).
 */
async function cancelOrder(orderId, userId, reason) {
  const trimmedReason = String(reason || '').trim();

  const { data: order, error: fetchErr } = await supabaseAdmin
    .from('orders')
    .select('id, status, customer_id, provider_id, order_number')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchErr) throw Object.assign(new Error(fetchErr.message), { status: 500 });
  if (!order) throw Object.assign(new Error('Không tìm thấy đơn hàng'), { status: 404 });
  if (order.customer_id !== userId && order.provider_id !== userId) {
    throw Object.assign(new Error('Bạn không có quyền hủy đơn hàng này'), { status: 403 });
  }
  if (order.status === 'cancelled') {
    throw httpError(400, 'Đơn hàng đã được hủy trước đó', 'already_cancelled');
  }
  if (order.status === 'completed') {
    throw Object.assign(new Error('Đơn hàng đã hoàn thành hoặc đã hủy'), { status: 409 });
  }

  const isCustomer = order.customer_id === userId;

  if (isCustomer) {
    if (!trimmedReason) {
      throw httpError(400, 'Lý do hủy không được để trống', 'validation_error');
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw httpError(
        400,
        `Không thể hủy đơn ở trạng thái "${order.status}"`,
        'cannot_cancel',
      );
    }
  }

  const previousStatus = order.status;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'cancelled',
      cancellation_reason: trimmedReason || null,
      cancelled_by: userId,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateError) {
    if (isCustomer) throw httpError(500, updateError.message, 'db_error');
    throw Object.assign(new Error(updateError.message), { status: 500 });
  }

  if (!isCustomer) {
    return enrichOrderWithProvider(updated);
  }

  await supabaseAdmin.from('order_status_history').insert({
    order_id: orderId,
    from_status: previousStatus,
    to_status: 'cancelled',
    changed_by: userId,
    notes: `Khách hàng hủy đơn: ${trimmedReason}`,
  });

  await createNotification(
    userId,
    'order_cancelled',
    'Đơn hàng đã bị hủy',
    `Đơn ${order.order_number} đã được hủy thành công.`,
    { priority: 'normal', actionData: { order_id: orderId } },
  );

  if (order.provider_id) {
    await createNotification(
      order.provider_id,
      'order_cancelled',
      'Đơn hàng đã bị hủy',
      `Đơn ${order.order_number} đã bị khách hủy. Lý do: ${trimmedReason}`,
      { priority: 'high', actionData: { order_id: orderId } },
    );
  }

  let refundRequest = null;
  let refundSkipReason = null;
  try {
    refundRequest = await paymentsService.requestRefundForOrder(
      userId,
      orderId,
      trimmedReason,
      {
        statusBeforeCancel: previousStatus,
        hadProvider: Boolean(order.provider_id),
      },
    );
  } catch (err) {
    if (err.code === 'no_refundable_payment') {
      refundSkipReason = 'no_refundable_payment';
    } else {
      throw err;
    }
  }

  return {
    order: await enrichOrderWithProvider(updated),
    refund_request: refundRequest,
    refund_skip_reason: refundSkipReason,
  };
}

// ── POST /api/orders/:id/delivery-photo ───────────────────────────────────────
async function uploadDeliveryPhoto(orderId, providerId, file) {
  if (!file?.buffer?.length) throw Object.assign(new Error('Thiếu file ảnh'), { status: 400 });

  const ext = EXT_BY_MIME[file.mimetype];
  if (!ext) throw Object.assign(new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP'), { status: 400 });

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
    throw Object.assign(new Error('Chỉ upload ảnh khi đơn đang thực hiện'), { status: 409 });

  const objectPath = `${orderId}/delivery-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(DELIVERY_PHOTOS_BUCKET)
    .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: true });

  if (uploadError) throw Object.assign(new Error(uploadError.message), { status: 500 });

  const { data: urlData } = supabaseAdmin.storage
    .from(DELIVERY_PHOTOS_BUCKET)
    .getPublicUrl(objectPath);
  const photoUrl = urlData?.publicUrl;
  if (!photoUrl) throw Object.assign(new Error('Không tạo được URL ảnh'), { status: 500 });

  const { error: updateErr } = await supabaseAdmin
    .from('orders')
    .update({ delivery_photo_url: photoUrl })
    .eq('id', orderId);

  if (updateErr) throw Object.assign(new Error(updateErr.message), { status: 500 });

  return { photo_url: photoUrl };
}

module.exports = {
  listOrdersForUser,
  createOrder,
  providerRespond,
  getOrderById,
  acceptOrder,
  startOrder,
  declineOrder,
  completeOrder,
  cancelOrder,
  uploadDeliveryPhoto,
};
