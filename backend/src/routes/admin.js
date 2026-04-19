const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');
const { seedLimiter } = require('../middleware/rateLimiter');

// Seed route — rate limited, creates the first admin account only if none exists
router.post('/seed', seedLimiter, adminController.seed);

// All remaining admin routes require admin authentication
router.use(adminAuth);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.get('/users/:id/rules', adminController.getUserRules);
router.get('/users/:id/activity', adminController.getUserActivity);
router.get('/users/:id/alerts', adminController.getUserAlerts);
router.put('/users/:id/suspend', adminController.suspendUser);
router.put('/users/:id/unsuspend', adminController.unsuspendUser);
router.put('/users/:id/verify-email', adminController.verifyUserEmail);

// Analytics & health
router.get('/analytics', adminController.getAnalytics);
router.get('/health', adminController.getSystemHealth);

// Activity monitoring
router.get('/activity/summary', adminController.getActivitySummary);

// Alerts
router.get('/alerts/summary', adminController.getAlertsSummary);
router.get('/alerts', adminController.getAlerts);

// Account deletions
router.get('/deletions', adminController.getDeletionsPending);
router.put('/deletions/:id/cancel', adminController.cancelDeletion);
router.post('/deletions/purge', adminController.purgeDeletions);

// Content filters
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
