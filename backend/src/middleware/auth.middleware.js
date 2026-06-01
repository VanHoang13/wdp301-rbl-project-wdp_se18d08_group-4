const { getUserFromToken, supabaseAdmin } = require('../services/supabase.service');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Bearer token từ Supabase Auth (Flutter supabase_flutter).
 * Dùng cho orders, payments, customers, admin — cho đến khi chuyển hết sang Node JWT.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Thiếu access token',
      });
    }

    const user = await getUserFromToken(token);
    req.user = { id: user.id, email: user.email };
    req.accessToken = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn',
    });
  }
}

/**
 * Bearer JWT do Node API phát hành (auth.service — BE-003+).
 * Dùng cho /api/auth/me, /api/auth/change-password.
 */
async function requireNodeAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Thiếu access token' });
    }

    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    req.accessToken = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn',
      code: 'invalid_token',
    });
  }
}

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'Thiếu access token' });
      }

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role, status')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin người dùng',
        });
      }

      if (profile.status && profile.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa',
        });
      }

      const role = profile.role;
      req.user.role = role;

      if (!role || !roles.includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập',
        });
      }

      req.userRole = role;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi kiểm tra quyền',
      });
    }
  };
}

module.exports = { requireAuth, requireNodeAuth, requireRole };
