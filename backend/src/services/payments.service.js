const { supabaseAdmin } = require('./supabase.service');
const { httpError } = require('./auth.helpers');
const { createNotification, notifyAdmins } = require('./notification.service');
const payosService = require('./payos.service');

/**
 * BE-034: GET /api/customers/me/wallet
 * Lấy số dư ví và điểm tích lũy của khách hàng
 */
async function getWalletBalance(userId) {
  try {
    // Get wallet balance
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency, updated_at')
      .eq('user_id', userId)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (wallet doesn't exist yet)
      throw httpError(500, walletError.message, 'db_error');
    }

    // Get loyalty points from customer_profiles
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('customer_profiles')
      .select('loyalty_points')
      .eq('id', userId)
      .single();

    if (customerError && customerError.code !== 'PGRST116') {
      throw httpError(500, customerError.message, 'db_error');
    }

    // Return wallet info with loyalty points
    return {
      balance: walletData?.balance || 0,
      currency: walletData?.currency || 'VND',
      loyalty_points: customerData?.loyalty_points || 0,
      last_updated: walletData?.updated_at || null,
    };
  } catch (error) {
    if (error.status) throw error;
    throw httpError(500, 'Lỗi khi lấy số dư ví', 'wallet_error');
  }
}

/**
 * BE-036: GET /api/customers/me/payment-methods
 * Lấy danh sách phương thức thanh toán đã lưu
 */
async function getPaymentMethods(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .select('id, kind, label, is_default, is_active, metadata, created_at')
      .eq('customer_id', userId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw httpError(500, error.message, 'db_error');

    return data || [];
  } catch (error) {
    if (error.status) throw error;
    throw httpError(500, 'Lỗi khi lấy danh sách phương thức thanh toán', 'payment_methods_error');
  }
}

/**
 * BE-036: POST /api/customers/me/payment-methods
 * Thêm phương thức thanh toán mới
 */
async function addPaymentMethod(userId, body) {
  try {
    const { kind, label, token_ref, metadata } = body;

    // Validation
    if (!kind || !label || !token_ref) {
      throw httpError(400, 'Thiếu kind, label hoặc token_ref', 'validation_error');
    }

    const validKinds = ['payos', 'momo', 'bank_transfer', 'credit_card', 'debit_card'];
    if (!validKinds.includes(kind)) {
      throw httpError(400, `kind phải là một trong: ${validKinds.join(', ')}`, 'validation_error');
    }

    // Tìm bản ghi cùng kind + token_ref (kể cả đã soft-delete)
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('payment_methods')
      .select('id, is_active')
      .eq('customer_id', userId)
      .eq('kind', kind)
      .eq('token_ref', token_ref)
      .maybeSingle();

    if (existingError) {
      throw httpError(500, existingError.message, 'db_error');
    }

    if (existing?.is_active) {
      throw httpError(400, 'Phương thức thanh toán này đã tồn tại', 'duplicate_payment_method');
    }

    const { count: activeCount, error: countError } = await supabaseAdmin
      .from('payment_methods')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', userId)
      .eq('is_active', true);

    if (countError) {
      throw httpError(500, countError.message, 'db_error');
    }

    const isDefault = (activeCount || 0) === 0;

    // Khôi phục PT đã xóa mềm thay vì insert trùng UNIQUE constraint
    if (existing && !existing.is_active) {
      const { data: reactivated, error: reactivateError } = await supabaseAdmin
        .from('payment_methods')
        .update({
          label,
          metadata: metadata || null,
          is_active: true,
          is_default: isDefault,
        })
        .eq('id', existing.id)
        .eq('customer_id', userId)
        .select()
        .single();

      if (reactivateError) {
        throw httpError(500, reactivateError.message, 'db_error');
      }

      if (isDefault && reactivated?.kind) {
        await supabaseAdmin
          .from('customer_profiles')
          .update({ preferred_payment_method: reactivated.kind })
          .eq('id', userId);
      }

      return reactivated;
    }

    // Insert new payment method
    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .insert({
        customer_id: userId,
        kind,
        label,
        token_ref,
        is_default: isDefault,
        is_active: true,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw httpError(400, 'Phương thức thanh toán này đã tồn tại', 'duplicate_payment_method');
      }
      throw httpError(500, error.message, 'db_error');
    }

    return data;
  } catch (error) {
    if (error.status) throw error;
    throw httpError(500, 'Lỗi khi thêm phương thức thanh toán', 'add_payment_method_error');
  }
}

/**
 * BE-036: PATCH /api/customers/me/payment-methods/:id
 * Cập nhật phương thức thanh toán (đặt làm mặc định, kích hoạt/tắt)
 */
async function updatePaymentMethod(userId, paymentMethodId, body) {
  try {
    const { is_default, is_active } = body;

    // Verify that this payment method belongs to the user
    const { data: paymentMethod, error: fetchError } = await supabaseAdmin
      .from('payment_methods')
      .select('id, is_default')
      .eq('id', paymentMethodId)
      .eq('customer_id', userId)
      .single();

    if (fetchError || !paymentMethod) {
      throw httpError(404, 'Không tìm thấy phương thức thanh toán', 'not_found');
    }

    // If setting as default, unset other defaults for this customer
    if (is_default === true && !paymentMethod.is_default) {
      await supabaseAdmin
        .from('payment_methods')
        .update({ is_default: false })
        .eq('customer_id', userId)
        .neq('id', paymentMethodId);
    }

    // Update the payment method
    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .update({
        ...(is_default !== undefined && { is_default }),
        ...(is_active !== undefined && { is_active }),
      })
      .eq('id', paymentMethodId)
      .eq('customer_id', userId)
      .select()
      .single();

    if (error) throw httpError(500, error.message, 'db_error');

    // Update preferred_payment_method in customer_profiles if setting default
    if (is_default === true && paymentMethod) {
      const { data: pm } = await supabaseAdmin
        .from('payment_methods')
        .select('kind')
        .eq('id', paymentMethodId)
        .single();

      if (pm?.kind) {
        await supabaseAdmin
          .from('customer_profiles')
          .update({ preferred_payment_method: pm.kind })
          .eq('id', userId);
      }
    }

    return data;
  } catch (error) {
    if (error.status) throw error;
    throw httpError(500, 'Lỗi khi cập nhật phương thức thanh toán', 'update_payment_method_error');
  }
}

/**
 * BE-036: DELETE /api/customers/me/payment-methods/:id
 * Xóa phương thức thanh toán
 */
async function deletePaymentMethod(userId, paymentMethodId) {
  try {
    // Verify that this payment method belongs to the user
    const { data: paymentMethod, error: fetchError } = await supabaseAdmin
      .from('payment_methods')
      .select('id, is_default')
      .eq('id', paymentMethodId)
      .eq('customer_id', userId)
      .single();

    if (fetchError || !paymentMethod) {
      throw httpError(404, 'Không tìm thấy phương thức thanh toán', 'not_found');
    }

    // Soft delete (set is_active = false)
    const { error: deleteError } = await supabaseAdmin
      .from('payment_methods')
      .update({ is_active: false })
      .eq('id', paymentMethodId)
      .eq('customer_id', userId);

    if (deleteError) throw httpError(500, deleteError.message, 'db_error');

    // If this was the default, set another one as default
    if (paymentMethod.is_default) {
      const { data: nextDefault } = await supabaseAdmin
        .from('payment_methods')
        .select('id, kind')
        .eq('customer_id', userId)
        .eq('is_active', true)
        .neq('id', paymentMethodId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (nextDefault) {
        await supabaseAdmin
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', nextDefault.id);

        // Update preferred_payment_method
        await supabaseAdmin
          .from('customer_profiles')
          .update({ preferred_payment_method: nextDefault.kind })
          .eq('id', userId);
      }
    }

    return { success: true };
  } catch (error) {
    if (error.status) throw error;
    throw httpError(500, 'Lỗi khi xóa phương thức thanh toán', 'delete_payment_method_error');
  }
}

const PAYMENT_METHOD_LABELS = {
  payos: 'PayOS',
  momo: 'MoMo',
  wallet: 'Ví UniMove',
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  credit_card: 'Thẻ tín dụng',
  debit_card: 'Thẻ ghi nợ',
};

const SERVICE_TYPE_LABELS = {
  standard: 'Tiêu chuẩn',
  express: 'Nhanh',
  premium: 'Cao cấp',
};

function mapPaymentType(purpose) {
  switch (purpose) {
    case 'deposit':
      return 'deposit';
    case 'refund':
      return 'refund';
    case 'full':
    case 'final':
      return 'full_payment';
    default:
      return 'deposit';
  }
}

function mapPaymentStatus(status) {
  switch (status) {
    case 'pending':
    case 'processing':
      return 'pending';
    case 'completed':
      return 'completed';
    case 'failed':
    case 'cancelled':
      return 'failed';
    case 'refunded':
    case 'partially_refunded':
      return 'refunded';
    default:
      return 'pending';
  }
}

function resolveOrder(orderRow) {
  if (!orderRow) return null;
  return Array.isArray(orderRow) ? orderRow[0] : orderRow;
}

function buildServiceLabels(order) {
  const category = 'Chuyển trọ';
  const pkg = order?.service_packages;
  const packageName = Array.isArray(pkg) ? pkg[0]?.name : pkg?.name;
  const tier = SERVICE_TYPE_LABELS[order?.service_type] || 'Tiêu chuẩn';
  const serviceLabel = packageName
    ? `${category} · ${packageName}`
    : `${category} · Gói ${tier}`;

  return { service_label: serviceLabel, service_category: category };
}

function mapCustomerPayment(row) {
  const order = resolveOrder(row.orders);
  return {
    id: row.id,
    order_id: row.order_id,
    order_number: order?.order_number || null,
    amount: Number(row.amount),
    type: mapPaymentType(row.payment_purpose),
    status: mapPaymentStatus(row.status),
    method: PAYMENT_METHOD_LABELS[row.payment_method] || row.payment_method,
    created_at: row.created_at,
    description: row.description || null,
  };
}

function buildMaskedAccount(paymentMethod, bankAccountNumber) {
  if (bankAccountNumber) {
    const last4 = String(bankAccountNumber).slice(-4);
    const label = PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod;
    return `${label} ·••• ${last4}`;
  }
  if (paymentMethod === 'payos') return 'PayOS · QR';
  return PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod;
}

/**
 * BE-035 — GET /api/payments
 * Lịch sử giao dịch của customer (đặt cọc, thanh toán, hoàn tiền…)
 */
async function getPaymentHistory(userId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
    .from('payments')
    .select(
      `
      id, payment_code, order_id, amount, currency, payment_method,
      status, payment_purpose, description, created_at, payos_order_id,
      orders ( order_number, service_type, service_packages ( name ) )
    `,
      { count: 'exact' },
    )
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw httpError(500, error.message, 'db_error');

  const rows = data || [];
  await autoSyncPendingPayments(rows);

  return {
    items: rows.map(mapCustomerPayment),
    pagination: {
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit) || 1,
    },
  };
}

/**
 * BE-035 — GET /api/payments/:id
 * Chi tiết giao dịch — JOIN orders + reviews
 */
async function getPaymentDetail(userId, paymentId) {
  const { data: row, error } = await supabaseAdmin
    .from('payments')
    .select(
      `
      id, payment_code, order_id, customer_id, amount, currency, payment_method,
      status, escrow_status, payment_purpose, description,
      payos_transaction_id, payos_order_id, bank_account_number,
      created_at, paid_at,
      orders (
        order_number, service_type,
        service_packages ( name ),
        reviews ( rating, comment )
      )
    `,
    )
    .eq('id', paymentId)
    .eq('customer_id', userId)
    .maybeSingle();

  if (error) throw httpError(500, error.message, 'db_error');
  if (!row) throw httpError(404, 'Không tìm thấy giao dịch', 'payment_not_found');

  const synced = await maybeAutoSyncPayment(row);
  if (synced.synced && synced.payment) {
    const { data: refreshed, error: refreshError } = await supabaseAdmin
      .from('payments')
      .select(
        `
        id, payment_code, order_id, customer_id, amount, currency, payment_method,
        status, escrow_status, payment_purpose, description,
        payos_transaction_id, payos_order_id, bank_account_number,
        created_at, paid_at,
        orders (
          order_number, service_type,
          service_packages ( name ),
          reviews ( rating, comment )
        )
      `,
      )
      .eq('id', paymentId)
      .eq('customer_id', userId)
      .maybeSingle();

    if (!refreshError && refreshed) {
      Object.assign(row, refreshed);
    } else {
      Object.assign(row, synced.payment);
    }
  }

  const order = resolveOrder(row.orders);
  const reviewRow = order?.reviews;
  const review = Array.isArray(reviewRow) ? reviewRow[0] : reviewRow;
  const { service_label, service_category } = buildServiceLabels(order);
  const payment = mapCustomerPayment(row);

  return {
    payment,
    payment_code: row.payment_code,
    transaction_id: row.payos_transaction_id || row.payos_order_id || row.payment_code,
    service_label,
    service_category,
    paid_at: row.paid_at || row.created_at,
    escrow_status: row.escrow_status || null,
    masked_account: buildMaskedAccount(row.payment_method, row.bank_account_number),
    review_rating: review?.rating ?? null,
    review_comment: review?.comment ?? null,
    breakdown: [
      {
        label: payment.method,
        amount: `${Number(row.amount).toLocaleString('vi-VN')}đ`,
      },
    ],
  };
}

async function getPlatformSetting(key, defaultValue) {
  const { data, error } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw httpError(500, error.message, 'db_error');
  if (data?.value == null) return defaultValue;

  const raw = data.value;
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/"/g, ''));
  return Number.isFinite(num) ? num : defaultValue;
}

function resolveRefundRate({ percent, statusBeforeCancel, hadProvider, minutesSinceAccepted }) {
  if (percent !== undefined && percent !== null) {
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw httpError(400, 'percent phải là số từ 0 đến 100', 'validation_error');
    }
    return pct / 100;
  }

  // pending chưa có provider, hoặc matched (chọn báo giá nhưng chưa bắt đầu) → hoàn 100%
  if (statusBeforeCancel === 'pending' && !hadProvider) return 1.0;
  if (statusBeforeCancel === 'matched') return 1.0;

  // accepted → time-based
  if (statusBeforeCancel === 'accepted' && minutesSinceAccepted !== undefined) {
    return minutesSinceAccepted < 30 ? 0.9 : 0.7;
  }

  // fallback to platform settings
  const providerAccepted = hadProvider
    || (statusBeforeCancel && ['accepted', 'picking_up', 'in_progress'].includes(statusBeforeCancel));

  return providerAccepted
    ? getPlatformSetting('cancel_after_accept_refund_rate', 0.5)
    : getPlatformSetting('cancel_before_accept_refund_rate', 1.0);
}

/**
 * Tạo yêu cầu hoàn tiền pending — chờ admin duyệt mới cộng ví
 * Gọi từ hủy đơn hoặc POST /api/payments/refund (đơn phải đã cancelled)
 */
async function requestRefundForOrder(customerId, orderId, reason, options = {}) {
  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    throw httpError(400, 'Lý do hoàn tiền không được để trống', 'validation_error');
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, customer_id, status, provider_id, order_number')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw httpError(404, 'Không tìm thấy đơn hàng', 'order_not_found');
  }
  if (order.customer_id !== customerId) {
    throw httpError(403, 'Không có quyền truy cập đơn hàng này', 'access_denied');
  }
  if (order.status !== 'cancelled') {
    throw httpError(
      400,
      'Chỉ có thể yêu cầu hoàn tiền sau khi hủy đơn',
      'order_not_cancelled',
    );
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('id, amount, status, payment_purpose')
    .eq('order_id', orderId)
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .in('payment_purpose', ['deposit', 'full', 'final'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) throw httpError(500, paymentError.message, 'db_error');
  if (!payment) {
    throw httpError(400, 'Không tìm thấy khoản thanh toán hợp lệ để hoàn tiền', 'no_refundable_payment');
  }

  const { data: existingRefund, error: existingError } = await supabaseAdmin
    .from('refunds')
    .select('id, status, refund_amount')
    .eq('payment_id', payment.id)
    .in('status', ['pending', 'processing', 'completed'])
    .maybeSingle();

  if (existingError) throw httpError(500, existingError.message, 'db_error');
  if (existingRefund) {
    return {
      refund: existingRefund,
      order_number: order.order_number,
      payment_id: payment.id,
      payment_amount: Number(payment.amount),
      refund_percent: null,
      status: existingRefund.status,
      message: 'Yêu cầu hoàn tiền đã tồn tại, đang chờ admin duyệt',
      already_exists: true,
    };
  }

  const refundRate = await resolveRefundRate({
    percent: options.percent,
    statusBeforeCancel: options.statusBeforeCancel,
    hadProvider: options.hadProvider ?? Boolean(order.provider_id),
  });

  const refundAmount = Math.round(Number(payment.amount) * refundRate);
  if (refundAmount <= 0) {
    throw httpError(400, 'Số tiền hoàn phải lớn hơn 0', 'invalid_refund_amount');
  }

  const { data: refund, error: insertError } = await supabaseAdmin
    .from('refunds')
    .insert({
      payment_id: payment.id,
      order_id: orderId,
      refund_amount: refundAmount,
      refund_reason: trimmedReason,
      status: 'pending',
      requested_by: customerId,
      notes: options.statusBeforeCancel
        ? `status_before_cancel=${options.statusBeforeCancel}`
        : null,
    })
    .select()
    .single();

  if (insertError) throw httpError(500, insertError.message, 'db_error');

  await notifyAdmins(
    'system_announcement',
    'Yêu cầu hoàn tiền mới',
    `Đơn ${order.order_number}: khách yêu cầu hoàn ${refundAmount.toLocaleString('vi-VN')}đ. Vui lòng duyệt.`,
    {
      priority: 'high',
      actionData: { order_id: orderId, refund_id: refund.id, type: 'refund_approval' },
    },
  );

  await createNotification(
    customerId,
    'payment_received',
    'Yêu cầu hoàn tiền đã gửi',
    `Yêu cầu hoàn ${refundAmount.toLocaleString('vi-VN')}đ cho đơn ${order.order_number} đang chờ admin duyệt.`,
    { priority: 'normal', actionData: { order_id: orderId, refund_id: refund.id } },
  );

  return {
    refund,
    order_number: order.order_number,
    payment_id: payment.id,
    payment_amount: Number(payment.amount),
    refund_amount: refundAmount,
    refund_percent: Math.round(refundRate * 100),
    status: 'pending',
    message: 'Yêu cầu hoàn tiền đã gửi, chờ admin duyệt',
    already_exists: false,
  };
}

/**
 * BE-032 — POST /api/payments/refund
 * Chỉ dùng khi đơn đã hủy — tạo yêu cầu pending (không tự cộng ví)
 */
async function createRefund(customerId, body) {
  const { order_id, reason, percent } = body || {};

  if (!order_id || !reason) {
    throw httpError(400, 'Thiếu order_id hoặc reason', 'validation_error');
  }

  return requestRefundForOrder(customerId, order_id, reason, { percent });
}

/**
 * Xử lý hoàn tiền vào ví UniMove — cộng balance, cập nhật payment & refund
 */
async function ensureWallet(userId) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('wallets')
    .select('id, balance, currency')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) throw httpError(500, fetchError.message, 'db_error');
  if (existing) return existing;

  const { data: created, error: insertError } = await supabaseAdmin
    .from('wallets')
    .insert({ user_id: userId, balance: 0, currency: 'VND' })
    .select('id, balance, currency')
    .single();

  if (insertError) throw httpError(500, insertError.message, 'db_error');
  return created;
}

async function completeRefund(refundId, processedByUserId) {
  const { data: refund, error: fetchError } = await supabaseAdmin
    .from('refunds')
    .select(`
      id, payment_id, order_id, refund_amount, refund_reason, status, requested_by,
      payments ( id, customer_id, amount, status, payment_code )
    `)
    .eq('id', refundId)
    .single();

  if (fetchError || !refund) {
    throw httpError(404, 'Không tìm thấy yêu cầu hoàn tiền', 'refund_not_found');
  }

  if (refund.status === 'completed') {
    const wallet = await ensureWallet(refund.requested_by);
    return {
      refund,
      wallet_balance: Number(wallet.balance),
      message: 'Yêu cầu hoàn tiền đã được xử lý trước đó',
      already_processed: true,
    };
  }

  if (refund.status !== 'pending' && refund.status !== 'processing') {
    throw httpError(400, `Không thể xử lý hoàn tiền ở trạng thái "${refund.status}"`, 'invalid_refund_status');
  }

  const payment = Array.isArray(refund.payments) ? refund.payments[0] : refund.payments;
  if (!payment) {
    throw httpError(404, 'Không tìm thấy giao dịch thanh toán liên quan', 'payment_not_found');
  }

  const customerId = refund.requested_by;
  const refundAmount = Number(refund.refund_amount);
  const paymentAmount = Number(payment.amount);

  const wallet = await ensureWallet(customerId);
  const balanceBefore = Number(wallet.balance);
  const balanceAfter = balanceBefore + refundAmount;

  const { error: walletError } = await supabaseAdmin
    .from('wallets')
    .update({ balance: balanceAfter, updated_at: new Date().toISOString() })
    .eq('id', wallet.id);

  if (walletError) throw httpError(500, walletError.message, 'db_error');

  const { error: txError } = await supabaseAdmin.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    transaction_type: 'refund',
    amount: refundAmount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    reference_type: 'refund',
    reference_id: refund.id,
    description: `Hoàn tiền đơn hàng: ${payment.payment_code || refund.order_id}`,
  });

  if (txError) throw httpError(500, txError.message, 'db_error');

  const newPaymentStatus = refundAmount >= paymentAmount ? 'refunded' : 'partially_refunded';

  const { error: paymentUpdateError } = await supabaseAdmin
    .from('payments')
    .update({
      status: newPaymentStatus,
      escrow_status: 'refunded',
    })
    .eq('id', payment.id);

  if (paymentUpdateError) throw httpError(500, paymentUpdateError.message, 'db_error');

  const { data: updatedRefund, error: refundUpdateError } = await supabaseAdmin
    .from('refunds')
    .update({
      status: 'completed',
      approved_by: processedByUserId || customerId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', refundId)
    .select()
    .single();

  if (refundUpdateError) throw httpError(500, refundUpdateError.message, 'db_error');

  await createNotification(
    customerId,
    'payment_received',
    'Hoàn tiền thành công',
    `Đã hoàn ${refundAmount.toLocaleString('vi-VN')}đ vào ví UniMove của bạn.`,
    { priority: 'high', actionData: { order_id: refund.order_id, refund_id: refundId } },
  );

  return {
    refund: updatedRefund,
    refund_amount: refundAmount,
    wallet_balance: balanceAfter,
    payment_status: newPaymentStatus,
    message: 'Hoàn tiền vào ví thành công',
    already_processed: false,
  };
}

async function findPaymentByPayOSData(payosData) {
  if (!payosData) return null;

  if (payosData.orderCode != null) {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, customer_id, order_id, amount, status, payment_code, payos_order_id')
      .eq('payos_order_id', String(payosData.orderCode))
      .maybeSingle();

    if (!error && data) return data;
  }

  const description = String(payosData.description || '').trim();
  if (description.startsWith('PAY-')) {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, customer_id, order_id, amount, status, payment_code, payos_order_id')
      .eq('payment_code', description)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}

async function applyPayOSPaymentUpdate(payment, options) {
  const {
    dbStatus,
    amountPaid,
    failureReason,
    payosOrderCode,
    transactionRef,
  } = options;

  if (payment.status === 'completed' || payment.status === 'refunded') {
    return { payment, updated: false, newStatus: payment.status };
  }

  const updatePayload = {
    status: dbStatus,
    payos_order_id: payosOrderCode != null ? String(payosOrderCode) : payment.payos_order_id,
  };

  if (transactionRef) {
    updatePayload.payos_transaction_id = transactionRef;
  }
  if (failureReason) {
    updatePayload.failure_reason = failureReason;
  }
  if (dbStatus === 'completed') {
    updatePayload.paid_at = new Date().toISOString();
    updatePayload.escrow_status = 'held';
  }

  const { data: updated, error } = await supabaseAdmin
    .from('payments')
    .update(updatePayload)
    .eq('id', payment.id)
    .select('id, payment_code, order_id, amount, status, escrow_status, paid_at, payment_purpose')
    .single();

  if (error) throw httpError(500, error.message, 'db_error');

  // Khi thanh toán cọc thành công → đánh dấu deposit_paid trên orders
  if (dbStatus === 'completed' && updated?.order_id &&
      (updated.payment_purpose === 'deposit' || updated.payment_purpose == null)) {
    await supabaseAdmin
      .from('orders')
      .update({ deposit_paid: true, deposit_paid_at: updatePayload.paid_at })
      .eq('id', updated.order_id)
      .in('status', ['matched', 'pending']); // chỉ update nếu chưa completed/cancelled
  }

  return {
    payment: updated,
    updated: true,
    newStatus: dbStatus,
    amountPaid,
  };
}

const PAYOS_SYNC_FIELDS = 'id, customer_id, order_id, amount, status, payment_code, payos_order_id';

/**
 * Đồng bộ 1 payment từ PayOS API (dùng cho webhook fallback, return URL, auto-sync)
 */
async function syncPaymentRecord(payment) {
  if (!payment?.payos_order_id) {
    return { payment, synced: false, message: 'Giao dịch chưa có mã PayOS' };
  }
  if (payment.status === 'completed' || payment.status === 'refunded') {
    return { payment, synced: false, message: 'Giao dịch đã được xử lý trước đó' };
  }

  const payosData = await payosService.getPaymentStatus(payment.payos_order_id);
  const mapped = payosService.mapPayOSStatus(payosData, payment.amount);

  if (mapped.dbStatus === 'pending') {
    return {
      payment,
      synced: false,
      payos_status: payosData.status,
      message: 'PayOS chưa ghi nhận thanh toán',
    };
  }

  const txList = payosData.transactions;
  const firstTx = Array.isArray(txList) ? txList[0] : null;

  const result = await applyPayOSPaymentUpdate(payment, {
    ...mapped,
    payosOrderCode: payosData.orderCode,
    transactionRef: firstTx?.reference,
  });

  return {
    payment: result.payment,
    synced: result.updated,
    payos_status: payosData.status,
    message: result.newStatus === 'completed'
      ? 'Thanh toán đã được xác nhận'
      : `Cập nhật trạng thái: ${result.newStatus}`,
  };
}

async function syncPaymentByCode(paymentCode) {
  const code = String(paymentCode || '').trim();
  if (!code) {
    throw httpError(400, 'Thiếu payment_code', 'validation_error');
  }

  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select(PAYOS_SYNC_FIELDS)
    .eq('payment_code', code)
    .maybeSingle();

  if (error) throw httpError(500, error.message, 'db_error');
  if (!payment) {
    throw httpError(404, 'Không tìm thấy giao dịch', 'payment_not_found');
  }

  return syncPaymentRecord(payment);
}

async function maybeAutoSyncPayment(payment) {
  if (!payment || payment.status !== 'pending' || !payment.payos_order_id) {
    return { payment, synced: false };
  }

  try {
    return await syncPaymentRecord(payment);
  } catch (err) {
    console.warn('[PayOS] Auto-sync failed:', payment.payment_code, err.message);
    return { payment, synced: false };
  }
}

async function autoSyncPendingPayments(payments) {
  const pending = (payments || [])
    .filter((p) => p.status === 'pending' && p.payos_order_id)
    .slice(0, 5);

  await Promise.all(
    pending.map(async (row) => {
      const result = await maybeAutoSyncPayment(row);
      if (result.synced && result.payment) {
        Object.assign(row, result.payment);
      }
    }),
  );
}

/** POST /api/payments/:id/sync — đồng bộ thủ công (dự phòng) */
async function syncPaymentStatus(userId, paymentId) {
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select(PAYOS_SYNC_FIELDS)
    .eq('id', paymentId)
    .single();

  if (error || !payment) {
    throw httpError(404, 'Không tìm thấy giao dịch', 'payment_not_found');
  }
  if (payment.customer_id !== userId) {
    throw httpError(403, 'Không có quyền truy cập giao dịch này', 'access_denied');
  }

  return syncPaymentRecord(payment);
}

/**
 * Xử lý webhook PayOS v2 — tìm payment & cập nhật DB
 */
async function processPayOSWebhook(body) {
  const { data } = body || {};

  if (!data || data.orderCode == null) {
    throw httpError(400, 'Invalid webhook payload', 'invalid_payload');
  }

  const payment = await findPaymentByPayOSData(data);
  if (!payment) {
    return { found: false, paymentCode: data.description, orderCode: data.orderCode };
  }

  if (payment.status === 'completed' || payment.status === 'refunded') {
    return { found: true, alreadyProcessed: true, payment };
  }

  let mapped;
  if (payosService.isWebhookPaymentSuccess(body)) {
    const amountPaid = Number(data.amount || 0);
    mapped = {
      dbStatus: amountPaid >= Number(payment.amount) ? 'completed' : 'failed',
      amountPaid,
      failureReason: amountPaid >= Number(payment.amount)
        ? null
        : `Insufficient amount. Expected: ${payment.amount}, Paid: ${amountPaid}`,
      payosOrderCode: data.orderCode,
      transactionRef: data.reference || data.transactionDateTime,
    };
    if (mapped.dbStatus === 'failed' && mapped.failureReason) {
      // keep failed
    }
  } else {
    mapped = {
      dbStatus: 'failed',
      amountPaid: 0,
      failureReason: body.desc || 'PayOS webhook not successful',
      payosOrderCode: data.orderCode,
      transactionRef: data.reference,
    };
  }

  const result = await applyPayOSPaymentUpdate(payment, mapped);

  return {
    found: true,
    alreadyProcessed: false,
    payment: result.payment,
    newStatus: result.newStatus,
    paymentCode: payment.payment_code,
  };
}

module.exports = {
  getWalletBalance,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getPaymentHistory,
  getPaymentDetail,
  createRefund,
  requestRefundForOrder,
  completeRefund,
  syncPaymentStatus,
  syncPaymentByCode,
  syncPaymentRecord,
  processPayOSWebhook,
};
