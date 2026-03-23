const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// Seed route — no auth required, creates the first admin account
router.post('/seed', adminController.seed);

// All remaining admin routes require admin authentication
router.use(adminAuth);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id/suspend', adminController.suspendUser);
router.get('/analytics', adminController.getAnalytics);
router.get('/health', adminController.getSystemHealth);
router.get('/filters', adminController.getFilters);
router.put('/filters', adminController.updateFilter);
router.delete('/filters/:domain', adminController.deleteFilter);

// Subscription key management
router.post('/keys', adminController.createKey);
router.get('/keys', adminController.getKeys);
router.put('/keys/:id', adminController.updateKey);
router.put('/keys/:id/extend', adminController.extendKey);
router.delete('/keys/:id', adminController.deleteKey);

module.exports = router;
