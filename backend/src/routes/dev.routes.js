const express = require('express');
const { supabaseAdmin } = require('../services/supabase.service');
const { httpError } = require('../services/auth.helpers');
const env = require('../config/env');

const router = express.Router();

// Guard: block rõ ràng nếu production
router.use((_req, res, next) => {
  if (env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Forbidden in production' });
  }
  next();
});

/**
 * POST /api/dev/payments/simulate
 * Giả lập thanh toán thành công — chỉ dùng khi test
 * Body: { payment_code } hoặc { order_id }
 */
router.post('/payments/simulate', async (req, res) => {
  try {
    const { payment_code, order_id } = req.body || {};

    if (!payment_code && !order_id) {
      return res.status(400).json({ success: false, message: 'Thiếu payment_code hoặc order_id' });
    }

    // Tìm payment
    let query = supabaseAdmin
      .from('payments')
      .select('id, order_id, customer_id, amount, status, payment_code')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (payment_code) {
      query = query.eq('payment_code', payment_code);
    } else {
      query = query.eq('order_id', order_id);
    }

    const { data: payment, error: fetchError } = await query.maybeSingle();
    if (fetchError) throw httpError(500, fetchError.message, 'db_error');
    if (!payment) return res.status(404).json({ success: false, message: 'Không tìm thấy payment pending' });

    // Mark payment completed
    const { error: payError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'completed',
        escrow_status: 'held',
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (payError) throw httpError(500, payError.message, 'db_error');

    // Mark order deposit_paid + move to accepted if matched
    const { data: order, error: orderFetch } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('id', payment.order_id)
      .single();

    if (!orderFetch && order) {
      const orderUpdate = { deposit_paid: true };

      await supabaseAdmin
        .from('orders')
        .update(orderUpdate)
        .eq('id', order.id);
    }

    res.json({
      success: true,
      message: 'Giả lập thanh toán thành công',
      data: { payment_code: payment.payment_code, order_id: payment.order_id },
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

module.exports = router;
