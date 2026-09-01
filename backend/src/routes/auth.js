const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authLimiter, resetLimiter } = require('../middleware/rateLimiter');
const otpController = require('../controllers/otpController');

router.post('/register', authLimiter, [
  // Phone-first auth: phone is required, email is optional.
  body('phone')
    .exists({ values: 'falsy' }).withMessage('Phone number is required')
    .customSanitizer((v) => String(v || '').replace(/[\s-]/g, '')) // normalize: strip spaces/dashes
    .matches(/^\+?\d+$/).withMessage('Phone number may contain only digits and a leading +')
    .isLength({ min: 6, max: 20 }).withMessage('Phone number must be 6-20 characters'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  body('name').trim().notEmpty().isLength({ max: 100 }),
], authController.register);

// Phone OTP (CallPro SMS). Safe when SMS is unconfigured — request degrades gracefully.
router.post('/otp/request', resetLimiter, otpController.request);
router.post('/otp/verify', authLimiter, otpController.verify);
router.post('/reset-password-otp', resetLimiter, otpController.resetPasswordWithOtp);

router.post('/login', authLimiter, [
  // Accepts { identifier, password } (identifier = phone or email) OR the
  // legacy { email, password } shape (old app builds + the App Store review
  // account log in by email). Presence of one of the two is checked in the
  // controller so both shapes keep working.
  // Emails were stored through normalizeEmail() at registration (lowercase,
  // gmail dot-stripping, ...), so email-shaped identifiers must go through the
  // exact same normalization or stored values won't match on lookup.
  body('identifier').optional({ values: 'falsy' }).trim()
    .if((value) => typeof value === 'string' && value.includes('@'))
    .isEmail().withMessage('Invalid email').normalizeEmail(),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty(),
], authController.login);

router.post('/refresh', authLimiter, authController.refresh);
router.post('/forgot-password', resetLimiter, authController.forgotPassword);
router.post('/reset-password', resetLimiter, authController.resetPassword);

const auth = require('../middleware/auth');
router.get('/me', auth, authController.me);

// Email verification (authenticated but no emailVerified check)
router.post('/verify-email', auth, authController.verifyEmail);
router.post('/resend-verification', auth, resetLimiter, authController.resendVerification);

// Profile management
router.put('/profile', auth, [
  body('name').trim().notEmpty().isLength({ max: 100 }),
], authController.updateProfile);

router.put('/password', auth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
], authController.changePassword);

// Alert/notification settings
router.get('/alert-settings', auth, authController.getAlertSettings);
router.put('/alert-settings', auth, authController.updateAlertSettings);

// Account deletion
router.delete('/account', auth, authController.deleteAccount);
router.post('/cancel-deletion', auth, authController.cancelDeletion);

// FCM push token registration
router.post('/fcm-token', auth, [
  body('token').trim().notEmpty().withMessage('FCM token is required'),
  body('deviceId').optional().trim(),
  body('platform').optional().isIn(['ios', 'android']),
], authController.registerFcmToken);

router.delete('/fcm-token', auth, authController.removeFcmToken);

module.exports = router;
