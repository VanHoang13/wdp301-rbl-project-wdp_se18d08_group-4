const { getUserFromToken } = require('../services/supabase.service');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Thiếu access token' });
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
    const { supabaseAdmin } = require('../services/supabase.service');
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (!profile || !roles.includes(profile.role)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }

    req.userRole = profile.role;
    next();
  };
}

module.exports = { requireAuth, requireRole };
