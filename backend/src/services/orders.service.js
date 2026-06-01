const { supabaseAdmin, createUserClient } = require('./supabase.service');

async function listOrdersForUser(userId, role, accessToken) {
  const db = createUserClient(accessToken);
  let query = db.from('orders').select('*').order('created_at', { ascending: false });

  if (role === 'customer') {
    query = query.eq('customer_id', userId);
  } else if (role === 'provider') {
    query = query.or(`provider_id.eq.${userId},status.eq.pending,status.eq.matched`);
  }

  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return data;
}

async function createOrder(customerId, accessToken, payload) {
  const db = createUserClient(accessToken);

  const { data, error } = await db
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

async function providerRespond(orderId, providerId, accessToken, response, declineReason) {
  const db = createUserClient(accessToken);

  const { error: responseError } = await db.from('order_provider_responses').insert({
    order_id: orderId,
    provider_id: providerId,
    response,
    decline_reason: declineReason || null,
  });

  if (responseError) throw Object.assign(new Error(responseError.message), { status: 400 });

  if (response === 'accepted') {
    const { data, error } = await db
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

async function getOrderById(orderId, accessToken) {
  const db = createUserClient(accessToken);
  const { data, error } = await db.from('orders').select('*').eq('id', orderId).single();
  if (error) throw Object.assign(new Error(error.message), { status: 404 });
  return data;
}

module.exports = {
  listOrdersForUser,
  createOrder,
  providerRespond,
  getOrderById,
};
