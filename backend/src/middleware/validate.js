const { body, param, query, validationResult } = require('express-validator');

// Middleware to check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

// Escape regex special characters for safe use in MongoDB $regex
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- Reusable validators ---

const mongoId = (field) => param(field).isMongoId().withMessage(`Invalid ${field}`);

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

// --- Route-specific validators ---

const devicePairing = [
  body('pairingCode').trim().notEmpty().withMessage('Pairing code is required')
    .isLength({ min: 6, max: 8 }).withMessage('Invalid pairing code format')
    .isAlphanumeric().withMessage('Pairing code must be alphanumeric'),
  body('platform').optional().isIn(['android', 'ios']).withMessage('Platform must be android or ios'),
  body('model').optional().trim().isLength({ max: 100 }).withMessage('Model too long'),
  body('osVersion').optional().trim().isLength({ max: 50 }).withMessage('OS version too long'),
  body('appVersion').optional().trim().isLength({ max: 50 }).withMessage('App version too long'),
  checkValidation,
];

const geofenceCreate = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('radius').optional().isFloat({ min: 50, max: 50000 }).withMessage('Radius must be between 50 and 50000 meters'),
  checkValidation,
];

const geofenceUpdate = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('radius').optional().isFloat({ min: 50, max: 50000 }),
  checkValidation,
];

const screenTimeRules = [
  body('dailyLimitMin').optional().isInt({ min: 0, max: 1440 }).withMessage('Daily limit must be 0-1440 minutes'),
  body('perApp').optional().isArray({ max: 100 }).withMessage('Too many per-app rules'),
  body('perApp.*.packageName').optional().trim().notEmpty().isLength({ max: 200 }),
  body('perApp.*.limitMin').optional().isInt({ min: 0, max: 1440 }),
  body('schedule').optional().isObject(),
  body('schedule.enabled').optional().isBoolean(),
  body('schedule.restrictedPeriods').optional().isArray({ max: 20 }),
  checkValidation,
];

const appRules = [
  body('blockedApps').optional().isArray({ max: 500 }).withMessage('Too many blocked apps'),
  body('blockedApps.*').optional().trim().isLength({ max: 200 }),
  body('blockedCategories').optional().isArray({ max: 50 }),
  checkValidation,
];

const webFilterRules = [
  body('categories').optional().isArray({ max: 50 }),
  body('customBlock').optional().isArray({ max: 500 }).withMessage('Too many custom blocks'),
  body('customBlock.*').optional().trim().isLength({ max: 253 }),
  body('customAllow').optional().isArray({ max: 500 }),
  body('customAllow.*').optional().trim().isLength({ max: 253 }),
  checkValidation,
];

const subscriptionActivate = [
  body('key').trim().notEmpty().withMessage('Subscription key is required')
    .isLength({ min: 4, max: 50 }).withMessage('Invalid key format')
    .matches(/^[A-Z0-9-]+$/i).withMessage('Invalid key format'),
  checkValidation,
];

module.exports = {
  checkValidation,
  escapeRegex,
  mongoId,
  paginationRules,
  devicePairing,
  geofenceCreate,
  geofenceUpdate,
  screenTimeRules,
  appRules,
  webFilterRules,
  subscriptionActivate,
};
