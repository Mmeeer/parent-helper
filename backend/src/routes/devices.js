const router = require('express').Router();
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const devicesController = require('../controllers/devicesController');

// Child device endpoints
router.post('/complete-pairing', devicesController.completePairing);
router.post('/heartbeat', deviceAuth, devicesController.heartbeat);
router.post('/sync-apps', deviceAuth, devicesController.syncInstalledApps);

// Parent endpoints
router.post('/pair', auth, devicesController.pair);
router.get('/child/:childId', auth, devicesController.listByChild);
router.get('/:id/status', auth, devicesController.getStatus);
router.get('/:id/installed-apps', auth, devicesController.getInstalledApps);
router.post('/:id/command', auth, devicesController.sendCommand);
router.delete('/:id', auth, devicesController.unpair);

module.exports = router;
