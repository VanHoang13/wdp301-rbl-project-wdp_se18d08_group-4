const { supabaseAdmin } = require('./supabase.service');
const { createNotification } = require('./notification.service');
const { httpError } = require('./auth.helpers');

// ── GET /api/conversations ────────────────────────────────────────────────────
async function listConversations(userId, role) {
  const isCustomer = role === 'customer';
  const filterCol = isCustomer ? 'customer_id' : 'provider_id';

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select(`
      id,
      order_id,
      is_active,
      last_message_preview,
      last_message_at,
      customer_unread_count,
      provider_unread_count,
      created_at,
      order:orders!order_id(id, status, service_type, created_at),
      customer:profiles!customer_id(id, full_name, avatar_url, phone),
      provider:profiles!provider_id(id, full_name, avatar_url, phone)
    `)
    .eq(filterCol, userId)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) throw httpError(500, error.message, 'db_error');

  return (data || []).map((conv) => ({
    id: conv.id,
    order_id: conv.order_id,
    is_active: conv.is_active,
    last_message_preview: conv.last_message_preview,
    last_message_at: conv.last_message_at,
    unread_count: isCustomer ? conv.customer_unread_count : conv.provider_unread_count,
    created_at: conv.created_at,
    order: conv.order,
    counterpart: isCustomer ? conv.provider : conv.customer,
  }));
}

// ── GET /api/conversations/:orderId/messages ──────────────────────────────────
async function getMessages(orderId, userId) {
  const { data: conv, error: convErr } = await supabaseAdmin
    .from('conversations')
    .select('id, customer_id, provider_id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (convErr) throw httpError(500, convErr.message, 'db_error');

  if (!conv) return { conversation_id: null, messages: [] };

  if (conv.customer_id !== userId && conv.provider_id !== userId) {
    throw httpError(403, 'Không có quyền truy cập cuộc trò chuyện này', 'forbidden');
  }

  const isCustomer = conv.customer_id === userId;

  // Reset unread count for this user
  await supabaseAdmin
    .from('conversations')
    .update(isCustomer ? { customer_unread_count: 0 } : { provider_unread_count: 0 })
    .eq('id', conv.id);

  // Mark messages from the other side as read
  await supabaseAdmin
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conv.id)
    .eq('is_read', false)
    .neq('sender_id', userId);

  const { data: msgs, error: msgsErr } = await supabaseAdmin
    .from('messages')
    .select(`
      id,
      message_type,
      content,
      media_url,
      media_type,
      latitude,
      longitude,
      location_name,
      is_read,
      read_at,
      created_at,
      sender:profiles!sender_id(id, full_name, avatar_url),
      reply_to:messages!reply_to_id(id, content, sender_id)
    `)
    .eq('conversation_id', conv.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (msgsErr) throw httpError(500, msgsErr.message, 'db_error');

  return {
    conversation_id: conv.id,
    messages: (msgs || []).map((m) => ({
      id: m.id,
      message_type: m.message_type,
      content: m.content,
      media_url: m.media_url ?? null,
      media_type: m.media_type ?? null,
      latitude: m.latitude ?? null,
      longitude: m.longitude ?? null,
      location_name: m.location_name ?? null,
      is_read: m.is_read,
      read_at: m.read_at ?? null,
      is_mine: m.sender?.id === userId,
      sender: m.sender,
      reply_to: m.reply_to ?? null,
      created_at: m.created_at,
    })),
  };
}

// ── POST /api/conversations/:orderId/messages ─────────────────────────────────
async function sendMessage(orderId, userId, body) {
  const { content, reply_to_id } = body || {};

  if (!content || !String(content).trim()) {
    throw httpError(400, 'Nội dung tin nhắn không được để trống', 'validation_error');
  }

  // Verify user is a participant in this order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id, customer_id, provider_id, status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr) throw httpError(500, orderErr.message, 'db_error');
  if (!order) throw httpError(404, 'Không tìm thấy đơn hàng', 'not_found');

  if (order.customer_id !== userId && order.provider_id !== userId) {
    throw httpError(403, 'Không có quyền gửi tin nhắn trong cuộc trò chuyện này', 'forbidden');
  }

  const isCustomer = order.customer_id === userId;
  const senderRole = isCustomer ? 'customer' : 'provider';
  const recipientId = isCustomer ? order.provider_id : order.customer_id;

  // Get or create conversation
  let conv;
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select('id, customer_unread_count, provider_unread_count')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing) {
    conv = existing;
  } else {
    const { data: newConv, error: createErr } = await supabaseAdmin
      .from('conversations')
      .insert([{
        order_id: orderId,
        customer_id: order.customer_id,
        provider_id: order.provider_id,
      }])
      .select('id, customer_unread_count, provider_unread_count')
      .single();

    if (createErr) throw httpError(500, createErr.message, 'db_error');
    conv = newConv;
  }

  // Insert message
  const { data: msg, error: msgErr } = await supabaseAdmin
    .from('messages')
    .insert([{
      conversation_id: conv.id,
      sender_id: userId,
      sender_role: senderRole,
      message_type: 'text',
      content: String(content).trim(),
      reply_to_id: reply_to_id || null,
    }])
    .select('id, message_type, content, created_at')
    .single();

  if (msgErr) throw httpError(500, msgErr.message, 'db_error');

  // Update conversation metadata
  const preview = msg.content.length > 80 ? msg.content.substring(0, 80) + '…' : msg.content;
  const currentUnread = isCustomer
    ? (conv.provider_unread_count || 0)
    : (conv.customer_unread_count || 0);

  await supabaseAdmin
    .from('conversations')
    .update({
      last_message_id: msg.id,
      last_message_at: msg.created_at,
      last_message_preview: preview,
      ...(isCustomer
        ? { provider_unread_count: currentUnread + 1 }
        : { customer_unread_count: currentUnread + 1 }),
    })
    .eq('id', conv.id);

  // Notify recipient (fire-and-forget)
  createNotification(
    recipientId,
    'new_message',
    'Bạn có tin nhắn mới',
    preview,
    { actionData: { order_id: orderId }, icon: 'chat' },
  ).catch(() => {});

  return {
    id: msg.id,
    message_type: msg.message_type,
    content: msg.content,
    created_at: msg.created_at,
    is_mine: true,
  };
}

module.exports = { listConversations, getMessages, sendMessage };
