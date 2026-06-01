const { getUserFromToken } = require('../services/supabase.service');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Thiếu access token' 
      });
    }

    req.user = await getUserFromToken(token);
    req.accessToken = token;
    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      success: false,
      message: error.message || 'Unauthorized',
    });
  }
}

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const { supabaseAdmin } = require('../services/supabase.service');
      
      // Get user profile with role
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role, status')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy thông tin người dùng' 
        });
      }

      // Check if user is active
      if (profile.status !== 'active') {
        return res.status(403).json({ 
          success: false, 
          message: 'Tài khoản đã bị vô hiệu hóa' 
        });
      }

      // Check role permission
      if (!roles.includes(profile.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Không có quyền truy cập' 
        });
      }

      req.userRole = profile.role;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi kiểm tra quyền'
      });
    }
  };
}

module.exports = { requireAuth, requireRole };
