const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const emailVerified = require('../middleware/emailVerified');
const childrenController = require('../controllers/childrenController');

router.use(auth);
router.use(emailVerified);

router.post('/', [
  body('name').trim().notEmpty(),
  body('age').isInt({ min: 1, max: 18 }),
], childrenController.create);

router.get('/', childrenController.list);

router.put('/:id', [
  body('name').optional().trim().notEmpty(),
  body('age').optional().isInt({ min: 1, max: 18 }),
], childrenController.update);

router.delete('/:id', childrenController.remove);

module.exports = router;
