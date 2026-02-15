const router = require('express').Router();
const auth = require('../middleware/auth');
const rulesController = require('../controllers/rulesController');

// Child device can fetch rules without parent auth
router.get('/:childId', rulesController.get);

// Parent endpoints
router.put('/:childId/screen-time', auth, rulesController.setScreenTime);
router.put('/:childId/apps', auth, rulesController.setApps);
router.put('/:childId/web-filter', auth, rulesController.setWebFilter);

module.exports = router;
