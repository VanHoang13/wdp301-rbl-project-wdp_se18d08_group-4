const { supabaseAdmin } = require('../services/supabase.service');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Bearer JWT do Node API phát hành — dùng cho mọi route bảo vệ.
 */
async function requireAuth(req, res, next) {
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

/** @deprecated Dùng requireAuth — giữ alias để không vỡ import cũ. */
const requireNodeAuth = requireAuth;

function requireRole(...roles) {
  return async (req, res, next) => {
    let role = req.user?.role;

    if (!role && req.user?.id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();
      role = profile?.role;
      if (role) req.user.role = role;
    }

    if (!role || !roles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }

    req.userRole = role;
    next();
  };
}

module.exports = { requireAuth, requireNodeAuth, requireRole };
