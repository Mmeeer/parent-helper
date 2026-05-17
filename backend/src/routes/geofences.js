const router = require('express').Router();
const auth = require('../middleware/auth');
const emailVerified = require('../middleware/emailVerified');
const requireSubscription = require('../middleware/requireSubscription');
const geofenceController = require('../controllers/geofenceController');
const { geofenceCreate, geofenceUpdate } = require('../middleware/validate');

router.use(auth);
router.use(emailVerified);

router.get('/:childId', geofenceController.list);
router.post('/:childId', requireSubscription, geofenceCreate, geofenceController.create);
router.put('/:id', requireSubscription, geofenceUpdate, geofenceController.update);
router.delete('/:id', requireSubscription, geofenceController.remove);

module.exports = router;
