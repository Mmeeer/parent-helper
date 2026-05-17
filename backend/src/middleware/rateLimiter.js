const rateLimit = require('express-rate-limit');

// Strict: auth endpoints (login, register, forgot-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

// Very strict: admin seed (should only be called once)
const seedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many seed attempts. Try again later.' },
});

// Moderate: data sync from devices
const syncLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Sync rate limit exceeded.' },
});

// Stricter throttle for repeat offenders: keyed by device ID (set by deviceAuth)
const syncAbuseLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.device?._id?.toString() || 'unknown',
  validate: { xForwardedForHeader: false, ip: false },
  message: { error: 'Device sync throttled. Too many requests in a short period.' },
});

// Relaxed: general API reads
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Password reset: prevent enumeration
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset attempts. Please try again later.' },
});

module.exports = { authLimiter, seedLimiter, syncLimiter, syncAbuseLimiter, apiLimiter, resetLimiter };
