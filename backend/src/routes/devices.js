const router = require('express').Router();
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');
const devicesController = require('../controllers/devicesController');
const { syncLimiter } = require('../middleware/rateLimiter');
const { devicePairing } = require('../middleware/validate');

// Child device endpoints
router.post('/complete-pairing', devicePairing, devicesController.completePairing);
router.post('/heartbeat', deviceAuth, syncLimiter, devicesController.heartbeat);
router.post('/sync-apps', deviceAuth, syncLimiter, devicesController.syncInstalledApps);
router.post('/sos', deviceAuth, devicesController.sos);

// Parent endpoints
router.post('/pair', auth, devicesController.pair);
router.get('/child/:childId', auth, devicesController.listByChild);
router.get('/:id/status', auth, devicesController.getStatus);
router.get('/:id/installed-apps', auth, devicesController.getInstalledApps);
router.post('/:id/command', auth, devicesController.sendCommand);
router.delete('/:id', auth, devicesController.unpair);

module.exports = router;
