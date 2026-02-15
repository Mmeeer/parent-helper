const router = require('express').Router();
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const activityController = require('../controllers/activityController');

// Child device uploads activity
router.post('/sync', deviceAuth, activityController.sync);

// Parent endpoints
router.get('/:childId/summary', auth, activityController.summary);
router.get('/:childId/apps', auth, activityController.apps);
router.get('/:childId/web', auth, activityController.web);
router.get('/:childId/location', auth, activityController.location);

module.exports = router;
