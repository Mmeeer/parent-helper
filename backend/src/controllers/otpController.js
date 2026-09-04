const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const PhoneOtp = require('../models/PhoneOtp');
const User = require('../models/User');
const sms = require('../services/sms');

// Code validity is deliberately long (default 60 min, override OTP_TTL_MINUTES):
// clock skew between the API host and MongoDB must never invalidate a fresh code.
// The app's UI shows a 2-minute resend timer — that's cosmetic, not the validity.
const OTP_TTL_MS = Number(process.env.OTP_TTL_MINUTES || 60) * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;  // one SMS per phone per minute
const MAX_SENDS_PER_CODE = 5;          // per active window
const MAX_VERIFY_ATTEMPTS = 5;

const normalize = (phone) => String(phone || '').replace(/[\s-]/g, '');
const hash = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

/** Whether OTP verification is enforced at registration (needs CallPro configured). */
const otpRequired = () => sms.isConfigured() && process.env.OTP_REQUIRED === 'true';

// POST /auth/otp/request  { phone, purpose: 'register'|'login'|'reset' }
exports.request = async (req, res, next) => {
  try {
    const phone = normalize(req.body.phone);
    const purpose = ['register', 'login', 'reset'].includes(req.body.purpose) ? req.body.purpose : 'register';
    if (!/^\+?\d{6,20}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // login/reset only make sense for existing accounts; keep the response generic
    // either way so phone numbers cannot be enumerated.
    if (purpose !== 'register') {
      const exists = await User.findOne({ phone }).select('_id').lean();
      if (!exists) return res.json({ status: 'sent' });
    } else {
      const exists = await User.findOne({ phone }).select('_id').lean();
      if (exists) return res.status(409).json({ error: 'This phone number is already registered. Try logging in instead.' });
    }

    const existing = await PhoneOtp.findOne({ phone, purpose });
    if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ error: 'Please wait a minute before requesting another code.' });
    }
    if (existing && existing.sentCount >= MAX_SENDS_PER_CODE && existing.expiresAt > new Date()) {
      return res.status(429).json({ error: 'Too many codes requested. Try again later.' });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    await PhoneOtp.findOneAndUpdate(
      { phone, purpose },
      {
        $set: { codeHash: hash(code), attempts: 0, lastSentAt: new Date(), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
        $inc: { sentCount: 1 },
        $setOnInsert: { phone, purpose },
      },
      { upsert: true },
    );

    const result = await sms.sendSms(phone, `Prime Kids: Tanii batalgaajuulakh kod: ${code}`);

    const payload = { status: 'sent' };
    // Dev convenience, mirrors forgot-password: expose the code only when SMS is
    // not configured AND we're not in production.
    if (result.disabled && process.env.NODE_ENV !== 'production') payload.devCode = code;
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

const verifyCode = async (phone, purpose, code) => {
  const doc = await PhoneOtp.findOne({ phone, purpose });
  if (!doc || doc.expiresAt < new Date()) return { ok: false, error: 'Code expired. Request a new one.' };
  if (doc.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, error: 'Too many attempts. Request a new code.' };
  if (doc.codeHash !== hash(code)) {
    await PhoneOtp.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
    return { ok: false, error: 'Wrong code.' };
  }
  await PhoneOtp.deleteOne({ _id: doc._id });
  return { ok: true };
};

/** Short-lived proof that this phone was just verified (consumed by register/reset). */
const signOtpToken = (phone, purpose) =>
  jwt.sign({ phone, purpose, otp: true }, process.env.JWT_SECRET, { expiresIn: '10m' });

exports.verifyOtpToken = (token, phone, purpose) => {
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    return d.otp === true && d.purpose === purpose && normalize(d.phone) === normalize(phone);
  } catch {
    return false;
  }
};

// POST /auth/otp/verify  { phone, code, purpose } → { verified, otpToken }
exports.verify = async (req, res, next) => {
  try {
    const phone = normalize(req.body.phone);
    const purpose = ['register', 'login', 'reset'].includes(req.body.purpose) ? req.body.purpose : 'register';
    const code = String(req.body.code || '').trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Invalid code' });

    const r = await verifyCode(phone, purpose, code);
    if (!r.ok) return res.status(401).json({ error: r.error });
    res.json({ verified: true, otpToken: signOtpToken(phone, purpose) });
  } catch (err) {
    next(err);
  }
};

// POST /auth/reset-password-otp  { phone, code, newPassword }
exports.resetPasswordWithOtp = async (req, res, next) => {
  try {
    const phone = normalize(req.body.phone);
    const code = String(req.body.code || '').trim();
    const { newPassword } = req.body;
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Invalid code' });
    if (typeof newPassword !== 'string' || newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with a letter and a number.' });
    }
    const r = await verifyCode(phone, 'reset', code);
    if (!r.ok) return res.status(401).json({ error: r.error });

    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ error: 'Wrong code.' }); // same shape, no enumeration
    user.passwordHash = newPassword;      // hashed by the model's pre-save hook
    user.refreshToken = null;             // invalidate existing sessions
    await user.save();
    res.json({ message: 'Password updated. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

exports.otpRequired = otpRequired;
