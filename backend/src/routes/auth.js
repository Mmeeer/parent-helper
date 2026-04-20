const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authLimiter, resetLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  body('name').trim().notEmpty().isLength({ max: 100 }),
], authController.register);

router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
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
