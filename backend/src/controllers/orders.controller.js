const { supabaseAdmin } = require('../services/supabase.service');
const ordersService = require('../services/orders.service');

async function listOrders(req, res, next) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    const orders = await ordersService.listOrdersForUser(
      req.user.id,
      profile?.role || req.user.role || 'customer',
      req.query,
    );

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}

async function createOrder(req, res, next) {
  try {
    const order = await ordersService.createOrder(req.user.id, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await ordersService.getOrderById(req.params.id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

async function respondToOrder(req, res, next) {
  try {
    const { response, decline_reason } = req.body;
    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ success: false, message: 'response phải là accepted hoặc declined' });
    }

    const result = await ordersService.providerRespond(
      req.params.id,
      req.user.id,
      response,
      decline_reason,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** BE-025 — PATCH /api/orders/:id/cancel */
async function cancelOrder(req, res, next) {
  try {
    const { reason } = req.body || {};
    const data = await ordersService.cancelOrder(req.user.id, req.params.id, reason);
    let msg = 'Hủy đơn hàng thành công';
    if (data.refund_request) {
      msg = 'Hủy đơn thành công. Yêu cầu hoàn tiền đã gửi, chờ admin duyệt.';
    } else if (data.refund_skip_reason === 'no_refundable_payment') {
      msg = 'Hủy đơn thành công. Không có khoản thanh toán đã hoàn tất — không tạo yêu cầu hoàn tiền.';
    }
    res.json({ success: true, message: msg, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { listOrders, createOrder, getOrder, respondToOrder, cancelOrder };
