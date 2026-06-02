const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function getTransporter() {
  if (!env.smtp.isConfigured) {
    const err = new Error(
      'Chưa cấu hình SMTP. Thêm SMTP_HOST, SMTP_USER, SMTP_PASS vào file .env (repo root).',
    );
    err.status = 503;
    err.code = 'smtp_not_configured';
    throw err;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

async function sendPasswordResetOtp({ to, otp, expiresMinutes }) {
  const from = env.smtp.from;
  await getTransporter().sendMail({
    from,
    to,
    subject: 'UniMove — Mã đặt lại mật khẩu',
    text: `Mã OTP: ${otp}\nHết hạn sau ${expiresMinutes} phút.`,
    html: `<p>Mã OTP: <strong>${otp}</strong></p><p>Hết hạn sau ${expiresMinutes} phút.</p>`,
  });
}

module.exports = { sendPasswordResetOtp };
