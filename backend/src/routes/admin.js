const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// All admin routes require admin authentication
router.use(adminAuth);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id/suspend', adminController.suspendUser);
router.put('/users/:id/plan', adminController.updateUserPlan);
router.get('/analytics', adminController.getAnalytics);
router.get('/health', adminController.getSystemHealth);
router.get('/filters', adminController.getFilters);
router.put('/filters', adminController.updateFilter);
router.delete('/filters/:domain', adminController.deleteFilter);

module.exports = router;
