const nodemailer = require('nodemailer');

let transporter = null;

function initEmail() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP not configured. Emails will be logged to console only.');
    return false;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  console.log('[Email] SMTP transport initialized');
  return true;
}

async function sendEmail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@primekids.mn';

  if (!transporter) {
    console.log(`[Email] (no SMTP) To: ${to} | Subject: ${subject} | Body: ${text}`);
    return { logged: true };
  }

  const info = await transporter.sendMail({ from, to, subject, text, html });
  console.log(`[Email] Sent to ${to}: ${info.messageId}`);
  return info;
}

async function sendVerificationCode(email, code) {
  return sendEmail({
    to: email,
    subject: 'Prime Kids - Email Verification Code',
    text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not create an account, please ignore this email.`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
      <h2 style="color:#333">Email Verification</h2>
      <p>Your verification code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;margin:16px 0">${code}</div>
      <p style="color:#666;font-size:14px">This code expires in 15 minutes.</p>
      <p style="color:#999;font-size:12px">If you did not create an account, please ignore this email.</p>
    </div>`,
  });
}

async function sendPasswordResetCode(email, code) {
  return sendEmail({
    to: email,
    subject: 'Prime Kids - Password Reset Code',
    text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
      <h2 style="color:#333">Password Reset</h2>
      <p>Your password reset code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;margin:16px 0">${code}</div>
      <p style="color:#666;font-size:14px">This code expires in 15 minutes.</p>
      <p style="color:#999;font-size:12px">If you did not request this, please ignore this email.</p>
    </div>`,
  });
}

module.exports = { initEmail, sendEmail, sendVerificationCode, sendPasswordResetCode };
