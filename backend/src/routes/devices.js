const router = require('express').Router();
const auth = require('../middleware/auth');
const devicesController = require('../controllers/devicesController');

// Child device endpoint (no parent auth)
router.post('/complete-pairing', devicesController.completePairing);
router.post('/heartbeat', devicesController.heartbeat);

// Parent endpoints
router.post('/pair', auth, devicesController.pair);
router.get('/:id/status', auth, devicesController.getStatus);
router.post('/:id/command', auth, devicesController.sendCommand);

module.exports = router;
