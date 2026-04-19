const router = require('express').Router();
const auth = require('../middleware/auth');
const emailVerified = require('../middleware/emailVerified');
const geofenceController = require('../controllers/geofenceController');
const { geofenceCreate, geofenceUpdate } = require('../middleware/validate');

router.use(auth);
router.use(emailVerified);

router.get('/:childId', geofenceController.list);
router.post('/:childId', geofenceCreate, geofenceController.create);
router.put('/:id', geofenceUpdate, geofenceController.update);
router.delete('/:id', geofenceController.remove);

module.exports = router;
