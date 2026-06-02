const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  jwtSecret: process.env.JWT_SECRET || requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  passwordResetOtpExpiresMinutes: parseInt(
    process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || '10',
    10,
  ),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    get isConfigured() {
      return Boolean(this.host && this.user && this.pass);
    },
  },
};
