const router = require('express').Router();
const auth = require('../middleware/auth');
const alertsController = require('../controllers/alertsController');

router.use(auth);

router.get('/', alertsController.list);
router.put('/:id/read', alertsController.markRead);
router.put('/read-all', alertsController.markAllRead);

module.exports = router;
