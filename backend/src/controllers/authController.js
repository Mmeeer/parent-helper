const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { sendVerificationCode, sendPasswordResetCode, sendWelcomeEmail } = require('../services/email');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

const generateTokens = (userId, tokenFamily) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
  const refreshToken = jwt.sign(
    { id: userId, family: tokenFamily },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
  );
  return { accessToken, refreshToken };
};

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const tokenFamily = crypto.randomUUID();
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const user = new User({
      email, passwordHash: password, name, tokenFamily,
      emailVerificationCode: verificationCode,
      emailVerificationCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    const tokens = generateTokens(user._id, tokenFamily);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Send verification + welcome emails
    try {
      await sendVerificationCode(email, verificationCode);
      await sendWelcomeEmail(email, name);
    } catch (err) {
      console.error(`[Email] Failed to send verification/welcome to ${email}:`, err.message);
    }

    const response = {
      user: { id: user._id, email: user.email, name: user.name, emailVerified: false },
      ...tokens,
    };
    if (process.env.NODE_ENV !== 'production') {
      response.verificationCode = verificationCode;
    }
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(429).json({
        error: `Account temporarily locked. Try again in ${waitMinutes} minutes.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    const tokenFamily = crypto.randomUUID();
    const tokens = generateTokens(user._id, tokenFamily);
    user.refreshToken = tokens.refreshToken;
    user.tokenFamily = tokenFamily;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.json({
      user: { id: user._id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const SubscriptionKey = require('../models/SubscriptionKey');
    const user = await User.findById(req.user._id).populate('subscriptionKey').lean();
    const sub = user.subscriptionKey;
    let subscriptionActive = false;
    if (sub && sub.status === 'active') {
      if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
        await SubscriptionKey.findByIdAndUpdate(sub._id, { status: 'expired' });
      } else {
        subscriptionActive = true;
      }
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      subscription: sub ? {
        active: subscriptionActive,
        key: sub.key,
        maxKids: sub.maxKids,
        expiresAt: sub.expiresAt,
        status: sub.status,
      } : null,
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Token family check: detect reuse of old refresh tokens
    if (user.refreshToken !== refreshToken) {
      // Possible token theft — invalidate all sessions for this user
      user.refreshToken = null;
      user.tokenFamily = null;
      await user.save();
      console.warn(`[SECURITY] Refresh token reuse detected for user ${user._id}. All sessions invalidated.`);
      return res.status(401).json({ error: 'Token reuse detected. Please log in again.' });
    }

    // Rotate: issue new tokens in the same family
    const tokenFamily = user.tokenFamily || crypto.randomUUID();
    const tokens = generateTokens(user._id, tokenFamily);
    user.refreshToken = tokens.refreshToken;
    user.tokenFamily = tokenFamily;
    await user.save();

    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

// POST /auth/forgot-password — Generate a 6-digit reset code
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If that email is registered, a reset code has been sent.' });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    user.resetCode = resetCode;
    user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // Send password reset email
    try {
      await sendPasswordResetCode(email, resetCode);
    } catch (err) {
      console.error(`[Email] Failed to send reset code to ${email}:`, err.message);
    }

    const response = { message: 'If that email is registered, a reset code has been sent.' };
    if (process.env.NODE_ENV !== 'production') {
      response.resetCode = resetCode; // Only in dev/test
    }
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// POST /auth/reset-password — Verify code and set new password
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetCode: code,
      resetCodeExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    user.resetCode = null;
    user.resetCodeExpiresAt = null;
    user.refreshToken = null; // Invalidate existing sessions
    user.tokenFamily = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
};

// POST /auth/verify-email — Verify email with 6-digit code
exports.verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified' });
    }

    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (!user.emailVerificationCodeExpiresAt || user.emailVerificationCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    user.emailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationCodeExpiresAt = null;
    await user.save();

    res.json({ message: 'Email verified successfully', emailVerified: true });
  } catch (err) {
    next(err);
  }
};

// POST /auth/resend-verification — Resend email verification code
exports.resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified' });
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    user.emailVerificationCode = verificationCode;
    user.emailVerificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationCode(user.email, verificationCode);
    } catch (err) {
      console.error(`[Email] Failed to send verification to ${user.email}:`, err.message);
    }

    const response = { message: 'Verification code sent' };
    if (process.env.NODE_ENV !== 'production') {
      response.verificationCode = verificationCode;
    }
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// POST /auth/fcm-token — Register or update FCM push token
exports.registerFcmToken = async (req, res, next) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, deviceId, platform } = req.body;
    const user = await User.findById(req.user._id);

    // Remove existing entry for this token (in case of re-registration)
    user.fcmTokens = (user.fcmTokens || []).filter((t) => t.token !== token);

    // Add the new token
    user.fcmTokens.push({
      token,
      deviceId: deviceId || null,
      platform: platform || 'android',
      updatedAt: new Date(),
    });

    // Limit to 5 tokens per user (max 5 devices)
    if (user.fcmTokens.length > 5) {
      user.fcmTokens = user.fcmTokens.slice(-5);
    }

    await user.save();
    res.json({ status: 'registered' });
  } catch (err) {
    next(err);
  }
};

// DELETE /auth/account — Request account deletion (30-day grace period)
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password, reason } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required to confirm account deletion' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Mark account for deletion with 30-day grace period
    user.deletionRequestedAt = new Date();
    user.deletionReason = reason || null;
    user.refreshToken = null;
    user.tokenFamily = null;
    await user.save();

    console.log(`[Account Deletion] User ${user.email} requested account deletion. Will be purged after 30 days.`);

    res.json({ message: 'Account deletion requested. Your data will be permanently deleted after 30 days. You can contact support to cancel.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /auth/fcm-token — Remove FCM token on logout
exports.removeFcmToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.json({ status: 'ok' });

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { fcmTokens: { token } },
    });
    res.json({ status: 'removed' });
  } catch (err) {
    next(err);
  }
};
