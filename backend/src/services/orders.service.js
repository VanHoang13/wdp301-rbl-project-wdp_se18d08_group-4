const { supabaseAdmin } = require('./supabase.service');

const DELIVERY_PHOTOS_BUCKET = 'delivery-photos';
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function splitAddress(raw) {
  const address = String(raw || '').trim() || 'Chưa nhập địa chỉ';
  return { address, city: 'TP.HCM', district: 'Quận 1' };
}

function defaultVehicleSize(serviceType) {
  if (serviceType === 'premium') return 'large_truck';
  if (serviceType === 'express') return 'medium_truck';
  return 'small_truck';
}

function defaultPricing(serviceType, floorNumber) {
  const baseByType = { standard: 500000, express: 800000, premium: 1200000 };
  const basePrice = baseByType[serviceType] || 500000;
  const floorPrice = Math.max(0, Number(floorNumber) || 0) * 50000;
  return {
    base_price: basePrice,
    distance_price: 0,
    floor_price: floorPrice,
    service_fee: 0,
    total_price: basePrice + floorPrice,
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
    const statuses = String(status).split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('status', statuses);
    }
  }

  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return data;
}

async function createOrder(customerId, payload) {
  const body = payload || {};

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, phone')
    .eq('id', customerId)
    .single();

  const contactName = body.pickup_contact_name || profile?.full_name || 'Khách hàng';
  const contactPhone = body.pickup_contact_phone || profile?.phone || '+84900000000';
  const serviceType = body.service_type || 'standard';
  const pickup = splitAddress(body.pickup_address);
  const delivery = splitAddress(body.delivery_address || body.dropoff_address);
  const floor = body.pickup_floor ?? body.floor_number ?? 1;

  const pricing = body.base_price != null && body.total_price != null
    ? {
        base_price: body.base_price,
        distance_price: body.distance_price || 0,
        floor_price: body.floor_price || 0,
        service_fee: body.service_fee || 0,
        total_price: body.total_price,
      }
    : defaultPricing(serviceType, floor);

  const notes = [body.description, body.special_notes, body.pickup_notes]
    .filter(Boolean)
    .map(String)
    .join('\n');

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_id: customerId,
      vehicle_size: body.vehicle_size || defaultVehicleSize(serviceType),
      service_type: serviceType,
      pickup_address: pickup.address,
      pickup_city: body.pickup_city || pickup.city,
      pickup_district: body.pickup_district || pickup.district,
      pickup_floor: floor,
      pickup_contact_name: contactName,
      pickup_contact_phone: contactPhone,
      pickup_notes: notes || null,
      delivery_address: delivery.address,
      delivery_city: body.delivery_city || delivery.city,
      delivery_district: body.delivery_district || delivery.district,
      delivery_contact_name: body.delivery_contact_name || contactName,
      delivery_contact_phone: body.delivery_contact_phone || contactPhone,
      delivery_notes: body.delivery_notes || null,
      base_price: pricing.base_price,
      distance_price: pricing.distance_price,
      floor_price: pricing.floor_price,
      service_fee: pricing.service_fee,
      total_price: pricing.total_price,
      scheduled_pickup_time: body.scheduled_pickup_time,
      number_of_rooms: body.number_of_rooms || 1,
      number_of_helpers: body.number_of_helpers ?? body.num_helpers ?? 0,
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
    .update({ provider_id: providerId, status: 'accepted' })
    .eq('id', orderId)
    .eq('status', 'pending') // guard against race condition
    .select('*')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!data) throw Object.assign(new Error('Đơn hàng vừa được nhận bởi provider khác'), { status: 409 });
  return data;
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

  // Release escrow trên bảng payments
  await supabaseAdmin
    .from('payments')
    .update({ escrow_status: 'released' })
    .eq('order_id', orderId)
    .eq('escrow_status', 'held');

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
