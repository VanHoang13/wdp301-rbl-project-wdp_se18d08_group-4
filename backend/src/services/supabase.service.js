const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

/** Admin client — bypass RLS (webhooks, admin tasks). */
const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Verify JWT và lấy user từ access token. */
async function getUserFromToken(accessToken) {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return data.user;
}

/** Client scoped theo JWT user — tôn trọng RLS. */
function createUserClient(accessToken) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = {
  supabaseAdmin,
  getUserFromToken,
  createUserClient,
};
