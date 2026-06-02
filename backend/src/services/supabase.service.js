const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

/** Postgres qua service role — không dùng Supabase Auth JWT. */
const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Anon client — chỉ dùng cho Google sign-in (signInWithIdToken). */
const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = {
  supabaseAdmin,
  supabaseAnon,
};
