const router = require('express').Router();
const auth = require('../middleware/auth');
const approvalsController = require('../controllers/approvalsController');

router.use(auth);

router.get('/pending', approvalsController.pending);
router.put('/:id', approvalsController.decide);

module.exports = router;
