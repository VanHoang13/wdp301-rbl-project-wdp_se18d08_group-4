const { supabaseAdmin } = require('../services/supabase.service');

/** Tạo payment deposit — PayOS integration sẽ bổ sung ở bước sau. */
async function createDeposit(req, res, next) {
  try {
    const { order_id, amount, payment_method = 'payos' } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ success: false, message: 'Thiếu order_id hoặc amount' });
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id,
        customer_id: req.user.id,
        amount,
        payment_method,
        payment_purpose: 'deposit',
        escrow_status: 'pending',
        status: 'pending',
        description: 'Deposit cho đơn chuyển trọ',
      })
      .select('*')
      .single();

    if (error) throw Object.assign(new Error(error.message), { status: 400 });

    res.status(201).json({
      success: true,
      data,
      message: 'Payment created. TODO: gọi PayOS API để lấy payment_url',
    });
  } catch (error) {
    next(error);
  }
}

/** Webhook PayOS — xác nhận thanh toán (stub). */
async function payosWebhook(req, res) {
  // TODO: verify PayOS signature
  console.log('PayOS webhook received:', req.body);
  res.json({ success: true });
}

module.exports = { createDeposit, payosWebhook };
