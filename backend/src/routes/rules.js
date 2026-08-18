const router = require('express').Router();
const auth = require('../middleware/auth');
const emailVerified = require('../middleware/emailVerified');
const deviceAuth = require('../middleware/deviceAuth');
const requireSubscription = require('../middleware/requireSubscription');
const rulesController = require('../controllers/rulesController');
const { screenTimeRules, appRules, webFilterRules, iosSelectionRules } = require('../middleware/validate');
const { syncLimiter } = require('../middleware/rateLimiter');

// Child device fetches rules
router.get('/:childId', deviceAuth, rulesController.get);

// Child iOS device uploads its FamilyActivitySelection (opaque tokens + counts)
router.post('/:childId/ios-selection', deviceAuth, syncLimiter, iosSelectionRules, rulesController.setIosSelection);

// Parent fetches rules (must come before PUT routes)
router.get('/:childId/view', auth, rulesController.getForParent);

// Parent endpoints — with validation + subscription check
router.put('/:childId/screen-time', auth, emailVerified, requireSubscription, screenTimeRules, rulesController.setScreenTime);
router.put('/:childId/apps', auth, emailVerified, requireSubscription, appRules, rulesController.setApps);
router.put('/:childId/web-filter', auth, emailVerified, requireSubscription, webFilterRules, rulesController.setWebFilter);

module.exports = router;
