const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
], authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], authController.login);

router.post('/refresh', authController.refresh);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

const auth = require('../middleware/auth');
router.get('/me', auth, authController.me);

module.exports = router;
