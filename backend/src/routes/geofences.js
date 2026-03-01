const router = require('express').Router();
const auth = require('../middleware/auth');
const geofenceController = require('../controllers/geofenceController');

router.use(auth);

router.get('/:childId', geofenceController.list);
router.post('/:childId', geofenceController.create);
router.put('/:id', geofenceController.update);
router.delete('/:id', geofenceController.remove);

module.exports = router;
