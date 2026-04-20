/**
 * Email Service with provider abstraction.
 * Supports: SendGrid, Mailgun, SMTP (nodemailer)
 * Provider is selected via EMAIL_PROVIDER env var ('sendgrid' | 'mailgun' | 'smtp').
 */
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

let provider = null; // 'sendgrid' | 'mailgun' | 'smtp' | null
let smtpTransporter = null;
let mailgunConfig = null;

function initEmail() {
  const selected = (process.env.EMAIL_PROVIDER || '').toLowerCase();

  if (selected === 'sendgrid') {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn('[Email] SendGrid selected but SENDGRID_API_KEY is missing. Emails will be logged to console.');
      return false;
    }
    sgMail.setApiKey(apiKey);
    provider = 'sendgrid';
    console.log('[Email] SendGrid provider initialized');
    return true;
  }

  if (selected === 'mailgun') {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    if (!apiKey || !domain) {
      console.warn('[Email] Mailgun selected but MAILGUN_API_KEY or MAILGUN_DOMAIN is missing. Emails will be logged to console.');
      return false;
    }
    mailgunConfig = {
      apiKey,
      domain,
      baseUrl: process.env.MAILGUN_API_URL || 'https://api.mailgun.net',
    };
    provider = 'mailgun';
    console.log('[Email] Mailgun provider initialized');
    return true;
  }

  if (selected === 'smtp') {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('[Email] SMTP selected but credentials are missing. Emails will be logged to console.');
      return false;
    }

    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    provider = 'smtp';
    console.log('[Email] SMTP transport initialized');
    return true;
  }

  console.warn('[Email] No EMAIL_PROVIDER configured. Emails will be logged to console only.');
  return false;
}

const DEFAULT_FROM = 'Prime Kids <noreply@primekids.mn>';

async function sendEmail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (!provider) {
    console.log(`[Email] (console-only) To: ${to} | Subject: ${subject}`);
    console.log(`[Email] Body: ${text}`);
    return { logged: true };
  }

  if (provider === 'sendgrid') {
    const msg = { to, from, subject, text, html };
    const [response] = await sgMail.send(msg);
    console.log(`[Email] Sent via SendGrid to ${to} (status ${response.statusCode})`);
    return { provider: 'sendgrid', statusCode: response.statusCode };
  }

  if (provider === 'mailgun') {
    const { apiKey, domain, baseUrl } = mailgunConfig;
    const url = `${baseUrl}/v3/${domain}/messages`;
    const formData = new URLSearchParams();
    formData.append('from', from);
    formData.append('to', to);
    formData.append('subject', subject);
    if (text) formData.append('text', text);
    if (html) formData.append('html', html);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
      },
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Mailgun API error (${response.status}): ${errBody}`);
    }

    const result = await response.json();
    console.log(`[Email] Sent via Mailgun to ${to}: ${result.id}`);
    return { provider: 'mailgun', id: result.id };
  }

  if (provider === 'smtp') {
    const info = await smtpTransporter.sendMail({ from, to, subject, text, html });
    console.log(`[Email] Sent via SMTP to ${to}: ${info.messageId}`);
    return info;
  }
}

// ---------------------------------------------------------------------------
// HTML Email Templates
// ---------------------------------------------------------------------------

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr><td style="background:#4F46E5;padding:24px 32px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">Prime Kids</h1>
        </td></tr>
        <tr><td style="padding:32px">${content}</td></tr>
        <tr><td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;color:#999;font-size:12px">&copy; ${new Date().getFullYear()} Prime Kids. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function codeBlock(code) {
  return `<div style="font-size:36px;font-weight:700;letter-spacing:10px;text-align:center;padding:20px;background:#f0f0ff;border-radius:8px;margin:20px 0;color:#4F46E5">${code}</div>`;
}

// ---------------------------------------------------------------------------
// Template-based send functions
// ---------------------------------------------------------------------------

async function sendPasswordResetCode(email, code) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 12px;color:#333;font-size:20px">Password Reset</h2>
    <p style="color:#555;line-height:1.6">We received a request to reset your password. Use the code below to proceed:</p>
    ${codeBlock(code)}
    <p style="color:#666;font-size:14px">This code expires in <strong>15 minutes</strong>.</p>
    <p style="color:#999;font-size:13px;margin-top:24px">If you did not request a password reset, you can safely ignore this email. Your password will not be changed.</p>
  `);

  return sendEmail({
    to: email,
    subject: 'Prime Kids - Password Reset Code',
    text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
    html,
  });
}

async function sendVerificationCode(email, code) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 12px;color:#333;font-size:20px">Verify Your Email</h2>
    <p style="color:#555;line-height:1.6">Welcome to Prime Kids! Please verify your email address by entering the code below in the app:</p>
    ${codeBlock(code)}
    <p style="color:#666;font-size:14px">This code expires in <strong>15 minutes</strong>.</p>
    <p style="color:#999;font-size:13px;margin-top:24px">If you did not create an account, please ignore this email.</p>
  `);

  return sendEmail({
    to: email,
    subject: 'Prime Kids - Email Verification Code',
    text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not create an account, please ignore this email.`,
    html,
  });
}

async function sendWelcomeEmail(email, name) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 12px;color:#333;font-size:20px">Welcome to Prime Kids!</h2>
    <p style="color:#555;line-height:1.6">Hi ${name || 'there'},</p>
    <p style="color:#555;line-height:1.6">Thank you for joining Prime Kids. Your account is ready and you can start setting up parental controls for your family.</p>
    <div style="margin:24px 0;padding:20px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
      <p style="margin:0;color:#333;font-size:14px"><strong>Getting started:</strong></p>
      <ul style="margin:8px 0 0;padding-left:20px;color:#555;font-size:14px;line-height:1.8">
        <li>Add your child's device</li>
        <li>Set up screen time rules</li>
        <li>Configure app permissions</li>
      </ul>
    </div>
    <p style="color:#999;font-size:13px">If you have any questions, feel free to reach out to our support team.</p>
  `);

  return sendEmail({
    to: email,
    subject: 'Welcome to Prime Kids!',
    text: `Hi ${name || 'there'},\n\nWelcome to Prime Kids! Your account is ready.\n\nGet started by adding your child's device and setting up screen time rules.\n\nThank you for choosing Prime Kids!`,
    html,
  });
}

async function sendAccountDeletionEmail(email, name) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 12px;color:#333;font-size:20px">Account Deletion Requested</h2>
    <p style="color:#555;line-height:1.6">Hi ${name || 'there'},</p>
    <p style="color:#555;line-height:1.6">We have received your request to delete your Prime Kids account. Your account has been scheduled for permanent deletion.</p>
    <div style="margin:24px 0;padding:20px;background:#fef2f2;border-radius:8px;border-left:4px solid #ef4444">
      <p style="margin:0;color:#333;font-size:14px"><strong>What happens next:</strong></p>
      <ul style="margin:8px 0 0;padding-left:20px;color:#555;font-size:14px;line-height:1.8">
        <li>Your account will be permanently deleted after <strong>30 days</strong></li>
        <li>All your data including children profiles, devices, rules, activity logs, alerts, and geofences will be removed</li>
        <li>You have been logged out of all devices</li>
      </ul>
    </div>
    <div style="margin:24px 0;padding:20px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
      <p style="margin:0;color:#333;font-size:14px"><strong>Changed your mind?</strong></p>
      <p style="margin:8px 0 0;color:#555;font-size:14px;line-height:1.6">Simply log back in to your account within 30 days to cancel the deletion request.</p>
    </div>
    <p style="color:#999;font-size:13px;margin-top:24px">If you did not request this deletion, please log in immediately to secure your account and change your password.</p>
  `);

  return sendEmail({
    to: email,
    subject: 'Prime Kids - Account Deletion Confirmation',
    text: `Hi ${name || 'there'},\n\nWe have received your request to delete your Prime Kids account.\n\nYour account will be permanently deleted after 30 days. All your data (children, devices, rules, activity logs, alerts, geofences) will be removed.\n\nChanged your mind? Simply log back in within 30 days to cancel the deletion.\n\nIf you did not request this, please log in immediately and change your password.`,
    html,
  });
}

module.exports = {
  initEmail,
  sendEmail,
  sendPasswordResetCode,
  sendVerificationCode,
  sendWelcomeEmail,
  sendAccountDeletionEmail,
};
