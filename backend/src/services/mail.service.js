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
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }
  return transporter;
}

async function sendPasswordResetOtp({ to, otp, expiresMinutes }) {
  const from = env.smtp.from;
  const subject = 'UniMove — Mã đặt lại mật khẩu';
  const text = [
    'Bạn vừa yêu cầu đặt lại mật khẩu UniMove.',
    '',
    `Mã xác nhận: ${otp}`,
    `Mã hết hạn sau ${expiresMinutes} phút.`,
    '',
    'Nếu bạn không yêu cầu, hãy bỏ qua email này.',
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#2563eb">UniMove</h2>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:24px 0">${otp}</p>
      <p style="color:#64748b">Mã hết hạn sau <strong>${expiresMinutes} phút</strong>.</p>
      <p style="color:#94a3b8;font-size:12px">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `;

  await getTransporter().sendMail({ from, to, subject, text, html });
}

module.exports = {
  sendPasswordResetOtp,
};
