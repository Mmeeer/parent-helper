const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { sendVerificationCode, sendPasswordResetCode, sendWelcomeEmail, sendAccountDeletionEmail } = require('../services/email');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// Phones are stored normalized (spaces/dashes stripped) — apply the same
// normalization to lookups so "99 11-22 33" matches "99112233".
const normalizePhone = (value) => String(value || '').replace(/[\s-]/g, '');

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

    // Phone-first: phone is required (validated + normalized by the route
    // validator); email is optional (null allowed from clients).
    const { email, password, name, acceptedTerms } = req.body;
    const phone = normalizePhone(req.body.phone);

    const phoneTaken = await User.findOne({ phone });
    if (phoneTaken) {
      return res.status(409).json({ error: 'This phone number is already registered. Try logging in instead.' });
    }
    if (email) {
      const emailTaken = await User.findOne({ email });
      if (emailTaken) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const tokenFamily = crypto.randomUUID();
    const verificationCode = email ? crypto.randomInt(100000, 999999).toString() : null;
    const user = new User({
      // IMPORTANT: undefined (not null) when absent — the sparse unique index
      // skips missing fields but WOULD index an explicit null (collisions).
      email: email || undefined,
      phone,
      passwordHash: password,
      name,
      tokenFamily,
      emailVerificationCode: verificationCode,
      emailVerificationCodeExpiresAt: email ? new Date(Date.now() + 15 * 60 * 1000) : null,
      termsAcceptedAt: acceptedTerms === true ? new Date() : null,
    });
    const tokens = generateTokens(user._id, tokenFamily);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Send verification + welcome emails (only when an email was provided)
    if (email) {
      try {
        await sendVerificationCode(email, verificationCode);
        await sendWelcomeEmail(email, name);
      } catch (err) {
        console.error(`[Email] Failed to send verification/welcome to ${email}:`, err.message);
      }
    }

    const response = {
      user: { id: user._id, email: user.email || null, phone: user.phone, name: user.name, emailVerified: false },
      ...tokens,
    };
    if (process.env.NODE_ENV !== 'production' && verificationCode) {
      response.verificationCode = verificationCode;
    }
    res.status(201).json(response);
  } catch (err) {
    // Duplicate-key race (two simultaneous registrations, or legacy index
    // states) — return the same friendly 409s as the pre-checks above.
    if (err && err.code === 11000) {
      const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : null;
      if (field === 'phone') {
        return res.status(409).json({ error: 'This phone number is already registered. Try logging in instead.' });
      }
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // New shape: { identifier, password } where identifier is a phone number
    // or an email. Legacy shape { email, password } still accepted (old app
    // builds and the App Store review account log in by email).
    const { identifier, email, password } = req.body;
    const rawId = String(identifier || email || '').trim();
    if (!rawId) {
      return res.status(400).json({ error: 'Phone number or email is required' });
    }

    const user = rawId.includes('@')
      ? await User.findOne({ email: rawId.toLowerCase() })
      : await User.findOne({ phone: normalizePhone(rawId) });
    if (!user) {
      // Same message as a wrong password — don't reveal which part failed
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

    // Auto-cancel pending account deletion on login
    let deletionCancelled = false;
    if (user.deletionRequestedAt) {
      user.deletionRequestedAt = null;
      user.deletionReason = null;
      deletionCancelled = true;
      console.log(`[Account Deletion] User ${user.email} logged in — deletion request cancelled.`);
    }

    await user.save();

    res.json({
      user: { id: user._id, email: user.email || null, phone: user.phone || null, name: user.name, role: user.role, emailVerified: user.emailVerified },
      ...tokens,
      deletionCancelled,
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
      email: user.email || null,
      phone: user.phone || null,
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
    // Accepts { email } (legacy) or { identifier } (phone or email). Reset
    // codes are only ever delivered by email — phone-based reset needs OTP
    // delivery, which is out of scope for now. Accounts without an email get
    // the same generic response so we don't reveal account existence.
    const { email, identifier } = req.body;
    const rawId = String(identifier || email || '').trim();
    if (!rawId) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }

    const genericMessage = 'If that account is registered, a reset code has been sent to its email address.';

    const user = rawId.includes('@')
      ? await User.findOne({ email: rawId.toLowerCase() })
      : await User.findOne({ phone: normalizePhone(rawId) });
    if (!user || !user.email) {
      // Don't reveal whether the account exists (or whether it has an email)
      return res.json({ message: genericMessage });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    user.resetCode = resetCode;
    user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // Send password reset email
    try {
      await sendPasswordResetCode(user.email, resetCode);
    } catch (err) {
      console.error(`[Email] Failed to send reset code to ${user.email}:`, err.message);
    }

    const response = { message: genericMessage };
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

    // Phone-only accounts have no email to verify
    if (!user.email) {
      return res.status(400).json({ error: 'No email address on this account' });
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

    // A single FCM token identifies one app install, not one account. If another
    // account previously signed in on this phone, its stale copy of the token would
    // keep receiving that account's pushes, delivering other families' alerts here.
    // Detach the token from every other user before claiming it for this one.
    await User.updateMany(
      { _id: { $ne: user._id }, 'fcmTokens.token': token },
      { $pull: { fcmTokens: { token } } }
    );

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

    // Send deletion confirmation email (phone-only accounts have none)
    if (user.email) {
      try {
        await sendAccountDeletionEmail(user.email, user.name);
      } catch (err) {
        console.error(`[Email] Failed to send deletion confirmation to ${user.email}:`, err.message);
      }
    }

    console.log(`[Account Deletion] User ${user.email} requested account deletion. Will be purged after 30 days.`);

    res.json({ message: 'Account deletion requested. Your data will be permanently deleted after 30 days. Log back in within 30 days to cancel.' });
  } catch (err) {
    next(err);
  }
};

// POST /auth/cancel-deletion — Cancel a pending account deletion
exports.cancelDeletion = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.deletionRequestedAt) {
      return res.json({ message: 'No pending deletion request' });
    }

    user.deletionRequestedAt = null;
    user.deletionReason = null;
    await user.save();

    console.log(`[Account Deletion] User ${user.email} cancelled their deletion request.`);

    res.json({ message: 'Account deletion has been cancelled. Your account is safe.' });
  } catch (err) {
    next(err);
  }
};

// PUT /auth/profile — Update user profile (name)
exports.updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be under 100 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.name = name.trim();
    await user.save();

    res.json({
      id: user._id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      emailVerified: user.emailVerified,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /auth/password — Change password (requires current password)
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one letter and one number' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// PUT /auth/alert-settings — Update notification/alert preferences
exports.updateAlertSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.alertSettings = settings;
    await user.save();

    res.json({ alertSettings: user.alertSettings });
  } catch (err) {
    next(err);
  }
};

// GET /auth/alert-settings — Get notification/alert preferences
exports.getAlertSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ alertSettings: user.alertSettings });
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
