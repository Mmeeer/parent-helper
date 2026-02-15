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

module.exports = router;
