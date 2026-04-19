const router = require('express').Router();
const auth = require('../middleware/auth');
const geocodeController = require('../controllers/geocodeController');

// Reverse geocode with MongoDB caching — parent-only (auth required)
router.post('/reverse', auth, geocodeController.reverse);

module.exports = router;
