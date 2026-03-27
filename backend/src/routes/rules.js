const router = require('express').Router();
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const rulesController = require('../controllers/rulesController');
const { screenTimeRules, appRules, webFilterRules } = require('../middleware/validate');

// Child device fetches rules
router.get('/:childId', deviceAuth, rulesController.get);

// Parent fetches rules (must come before PUT routes)
router.get('/:childId/view', auth, rulesController.getForParent);

// Parent endpoints — with validation
router.put('/:childId/screen-time', auth, screenTimeRules, rulesController.setScreenTime);
router.put('/:childId/apps', auth, appRules, rulesController.setApps);
router.put('/:childId/web-filter', auth, webFilterRules, rulesController.setWebFilter);

module.exports = router;
