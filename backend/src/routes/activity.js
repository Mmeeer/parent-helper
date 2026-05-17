const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const activityController = require('../controllers/activityController');
const { syncLimiter, syncAbuseLimiter } = require('../middleware/rateLimiter');

// Cap request body size for sync endpoint (override global 10mb limit)
const syncBodyParser = express.json({ limit: '512kb' });

// Reject batches with oversized arrays
const MAX_ARRAY_LENGTH = 500;
function validateSyncArrays(req, res, next) {
  const { apps, web, location, blockedAttempts } = req.body;
  for (const [name, arr] of Object.entries({ apps, web, location, blockedAttempts })) {
    if (Array.isArray(arr) && arr.length > MAX_ARRAY_LENGTH) {
      return res.status(413).json({
        error: `Array "${name}" exceeds max length of ${MAX_ARRAY_LENGTH} (got ${arr.length})`,
      });
    }
  }
  next();
}

// Child device uploads activity — rate limited, body-capped, array-capped
router.post('/sync', syncBodyParser, deviceAuth, syncLimiter, syncAbuseLimiter, validateSyncArrays, activityController.sync);

// Parent endpoints
router.get('/:childId/summary', auth, activityController.summary);
router.get('/:childId/apps', auth, activityController.apps);
router.get('/:childId/web', auth, activityController.web);
router.get('/:childId/location', auth, activityController.location);
router.get('/:childId/daily-breakdown', auth, activityController.dailyBreakdown);

module.exports = router;
