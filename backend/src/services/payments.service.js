const { supabaseAdmin } = require('./supabase.service');
const { httpError } = require('./auth.helpers');

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
      status, payment_purpose, description, created_at,
      orders ( order_number, service_type, service_packages ( name ) )
    `,
      { count: 'exact' },
    )
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw httpError(500, error.message, 'db_error');

  return {
    items: (data || []).map(mapCustomerPayment),
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

module.exports = {
  getWalletBalance,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getPaymentHistory,
  getPaymentDetail,
};
