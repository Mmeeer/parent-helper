const router = require('express').Router();
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const devicesController = require('../controllers/devicesController');

// Child device endpoints
router.post('/complete-pairing', devicesController.completePairing);
router.post('/heartbeat', deviceAuth, devicesController.heartbeat);

// Parent endpoints
router.post('/pair', auth, devicesController.pair);
router.get('/child/:childId', auth, devicesController.listByChild);
router.get('/:id/status', auth, devicesController.getStatus);
router.post('/:id/command', auth, devicesController.sendCommand);
router.delete('/:id', auth, devicesController.unpair);

module.exports = router;
