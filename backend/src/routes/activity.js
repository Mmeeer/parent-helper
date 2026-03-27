const router = require('express').Router();
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const activityController = require('../controllers/activityController');
const { syncLimiter } = require('../middleware/rateLimiter');

// Child device uploads activity — rate limited
router.post('/sync', deviceAuth, syncLimiter, activityController.sync);

// Parent endpoints
router.get('/:childId/summary', auth, activityController.summary);
router.get('/:childId/apps', auth, activityController.apps);
router.get('/:childId/web', auth, activityController.web);
router.get('/:childId/location', auth, activityController.location);
router.get('/:childId/daily-breakdown', auth, activityController.dailyBreakdown);

module.exports = router;
