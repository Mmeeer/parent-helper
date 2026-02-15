const router = require('express').Router();
const auth = require('../middleware/auth');
const activityController = require('../controllers/activityController');

// Child device uploads activity (no parent auth)
router.post('/sync', activityController.sync);

// Parent endpoints
router.get('/:childId/summary', auth, activityController.summary);
router.get('/:childId/apps', auth, activityController.apps);
router.get('/:childId/web', auth, activityController.web);
router.get('/:childId/location', auth, activityController.location);

module.exports = router;
