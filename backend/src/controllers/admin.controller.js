const { supabaseAdmin } = require('../services/supabase.service');
const authService = require('../services/auth.service');

/**
 * Admin login — Node JWT (user_credentials), không dùng Supabase Auth.
 * POST /api/admin/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email và mật khẩu là bắt buộc',
      });
    }

    const data = await authService.login({ email, password });

    if (data.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập admin',
      });
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng nhập',
    });
  }
}

/**
 * Get admin profile
 * GET /api/admin/auth/profile
 */
async function getProfile(req, res) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, phone, created_at, updated_at')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin admin',
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin admin',
    });
  }
}

/**
 * Admin dashboard stats - Morning KPI Dashboard
 * GET /api/admin/dashboard
 */
async function getDashboard(req, res) {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: gmvYesterday } = await supabaseAdmin
      .from('orders')
      .select('total_price')
      .eq('status', 'completed')
      .gte('completed_at', yesterday.toISOString().split('T')[0])
      .lt('completed_at', now.toISOString().split('T')[0]);

    const gmv_yesterday = gmvYesterday?.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0) || 0;

    const { count: new_orders_24h } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString());

    const { count: active_customers } = await supabaseAdmin
      .from('orders')
      .select('customer_id', { count: 'exact', head: true })
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { count: active_providers } = await supabaseAdmin
      .from('provider_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true)
      .eq('is_verified', true);

    const { data: commissionData } = await supabaseAdmin
      .from('provider_earnings')
      .select('platform_commission')
      .gte('created_at', startOfMonth.toISOString());

    const commission_total = commissionData?.reduce((sum, earning) => sum + parseFloat(earning.platform_commission || 0), 0) || 0;

    const { data: ordersLast24h } = await supabaseAdmin
      .from('orders')
      .select('status')
      .gte('created_at', last24h.toISOString());

    const totalOrders24h = ordersLast24h?.length || 0;
    const completedOrders24h = ordersLast24h?.filter((o) => o.status === 'completed').length || 0;
    const completion_rate_24h = totalOrders24h > 0 ? (completedOrders24h / totalOrders24h) * 100 : 0;

    const { data: monthOrders } = await supabaseAdmin
      .from('orders')
      .select('total_price')
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString());

    const monthRevenue = monthOrders?.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0) || 0;
    const average_order_value = monthOrders?.length > 0 ? monthRevenue / monthOrders.length : 0;

    const { count: pending_verifications } = await supabaseAdmin
      .from('provider_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending');

    const { count: pending_disputes } = await supabaseAdmin
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'investigating']);

    const { count: pending_withdrawals } = await supabaseAdmin
      .from('provider_withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: new_customers_24h } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .gte('created_at', last24h.toISOString());

    const { count: new_providers_24h } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'provider')
      .gte('created_at', last24h.toISOString());

    res.json({
      success: true,
      data: {
        gmv_yesterday: Math.round(gmv_yesterday),
        new_orders_24h,
        active_customers,
        active_providers,
        commission_total: Math.round(commission_total),
        completion_rate_24h: Math.round(completion_rate_24h * 100) / 100,
        average_order_value: Math.round(average_order_value),
        new_customers_24h,
        new_providers_24h,
        pending_tasks: {
          verifications: pending_verifications || 0,
          disputes: pending_disputes || 0,
          withdrawals: pending_withdrawals || 0,
          total: (pending_verifications || 0) + (pending_disputes || 0) + (pending_withdrawals || 0),
        },
        generated_at: now.toISOString(),
        timezone: 'Asia/Ho_Chi_Minh',
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dashboard KPI',
    });
  }
}

/** GET /api/admin/dashboard/stats */
async function getDashboardStats(req, res) {
  return getDashboard(req, res);
}

/** GET /api/admin/providers/pending */
async function getPendingProviders(req, res) {
  try {
    const { data: providers, error } = await supabaseAdmin
      .from('provider_profiles')
      .select(`
        id,
        business_name,
        vehicle_type,
        vehicle_plate,
        verification_status,
        created_at,
        profiles!provider_profiles_id_fkey(
          full_name,
          email,
          phone,
          avatar_url
        ),
        provider_documents(
          id,
          document_type,
          document_url,
          document_number,
          issue_date,
          expiry_date,
          is_verified
        )
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: providers || [],
      count: providers?.length || 0,
    });
  } catch (error) {
    console.error('Get pending providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách provider chờ duyệt',
      error: error.message,
    });
  }
}

/** PUT /api/admin/providers/:id/verify */
async function verifyProvider(req, res) {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action phải là "approve" hoặc "reject"',
      });
    }

    const verification_status = action === 'approve' ? 'approved' : 'rejected';
    const is_verified = action === 'approve';

    const { data: updatedProvider, error } = await supabaseAdmin
      .from('provider_profiles')
      .update({
        verification_status,
        is_verified,
        verification_notes: notes,
        verified_at: new Date().toISOString(),
        verified_by: req.user.id,
      })
      .eq('id', id)
      .select(`
        *,
        profiles!provider_profiles_id_fkey(full_name, email)
      `)
      .maybeSingle();

    if (error) {
      console.error('Update provider error:', error);
      throw error;
    }

    if (!updatedProvider) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy provider',
      });
    }

    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: id,
        notification_type: 'provider_verified',
        title: action === 'approve' ? 'Tài khoản đã được xác thực' : 'Tài khoản bị từ chối',
        body:
          action === 'approve'
            ? 'Chúc mừng! Tài khoản nhà cung cấp của bạn đã được xác thực thành công.'
            : `Tài khoản của bạn bị từ chối. Lý do: ${notes || 'Không đạt yêu cầu'}`,
        priority: 'high',
      });
    } catch (notifError) {
      console.warn('Failed to create notification:', notifError.message);
    }

    res.json({
      success: true,
      message: `${action === 'approve' ? 'Duyệt' : 'Từ chối'} provider thành công`,
      data: updatedProvider,
    });
  } catch (error) {
    console.error('Verify provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xử lý duyệt provider',
      error: error.message,
    });
  }
}

/** GET /api/admin/disputes */
async function getDisputes(req, res) {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('disputes')
      .select(`
        id,
        dispute_type,
        subject,
        description,
        status,
        priority,
        evidence_images,
        refund_amount,
        created_at,
        resolved_at,
        orders!inner(
          order_number,
          total_price,
          status
        ),
        raised_by_profile:profiles!disputes_raised_by_fkey(
          full_name,
          email,
          role
        ),
        against_user_profile:profiles!disputes_against_user_id_fkey(
          full_name,
          email,
          role
        ),
        assigned_to_profile:profiles!disputes_assigned_to_fkey(
          full_name,
          email
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: disputes, error } = await query;
    if (error) {
      console.error('Supabase disputes error:', error);
      throw error;
    }

    let countQuery = supabaseAdmin.from('disputes').select('*', { count: 'exact', head: true });
    if (status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }
    const { count } = await countQuery;

    res.json({
      success: true,
      data: disputes || [],
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách khiếu nại',
      error: error.message,
    });
  }
}

/** GET /api/admin/disputes/:id */
async function getDisputeDetails(req, res) {
  try {
    const { id } = req.params;

    const { data: dispute, error } = await supabaseAdmin
      .from('disputes')
      .select(`
        *,
        orders!inner(
          order_number,
          total_price,
          status,
          pickup_address,
          delivery_address,
          created_at
        ),
        raised_by_profile:profiles!disputes_raised_by_fkey(
          full_name,
          email,
          phone,
          role
        ),
        against_user_profile:profiles!disputes_against_user_id_fkey(
          full_name,
          email,
          phone,
          role
        ),
        dispute_messages(
          id,
          message,
          attachments,
          is_internal,
          created_at,
          sender:profiles!dispute_messages_sender_id_fkey(
            full_name,
            role
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase dispute details error:', error);
      throw error;
    }

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khiếu nại',
      });
    }

    res.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    console.error('Get dispute details error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết khiếu nại',
      error: error.message,
    });
  }
}

/** PUT /api/admin/disputes/:id/resolve */
async function resolveDispute(req, res) {
  try {
    const { id } = req.params;
    const { resolution, resolution_type, refund_amount, internal_notes } = req.body;

    if (!resolution || !resolution_type) {
      return res.status(400).json({
        success: false,
        message: 'Resolution và resolution_type là bắt buộc',
      });
    }

    const { data: updatedDispute, error } = await supabaseAdmin
      .from('disputes')
      .update({
        status: 'resolved',
        resolution,
        resolution_type,
        refund_amount: refund_amount || null,
        resolved_by: req.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        orders!inner(order_number),
        raised_by_profile:profiles!disputes_raised_by_fkey(full_name, email)
      `)
      .maybeSingle();

    if (error) {
      console.error('Update dispute error:', error);
      throw error;
    }

    if (!updatedDispute) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khiếu nại',
      });
    }

    if (internal_notes) {
      await supabaseAdmin.from('dispute_messages').insert({
        dispute_id: id,
        sender_id: req.user.id,
        message: internal_notes,
        is_internal: true,
      });
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: updatedDispute.raised_by,
      notification_type: 'dispute_resolved',
      title: 'Khiếu nại đã được xử lý',
      body: `Khiếu nại cho đơn hàng ${updatedDispute.orders.order_number} đã được xử lý. ${resolution}`,
      priority: 'high',
    });

    if (refund_amount && refund_amount > 0) {
      await supabaseAdmin.from('refunds').insert({
        order_id: updatedDispute.order_id,
        refund_amount,
        refund_reason: `Dispute resolution: ${resolution}`,
        status: 'approved',
        requested_by: updatedDispute.raised_by,
        approved_by: req.user.id,
        processed_at: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Xử lý khiếu nại thành công',
      data: updatedDispute,
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xử lý khiếu nại',
      error: error.message,
    });
  }
}

module.exports = {
  login,
  getProfile,
  getDashboard,
  getDashboardStats,
  getPendingProviders,
  verifyProvider,
  getDisputes,
  getDisputeDetails,
  resolveDispute,
};
