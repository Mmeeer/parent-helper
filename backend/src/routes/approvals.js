const router = require('express').Router();
const auth = require('../middleware/auth');
const requireSubscription = require('../middleware/requireSubscription');
const approvalsController = require('../controllers/approvalsController');

router.use(auth);

router.get('/pending', approvalsController.pending);
router.put('/:id', requireSubscription, approvalsController.decide);

module.exports = router;
