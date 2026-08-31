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
  // The parent app sends per-app entries as { appId, appName, limitMin }.
  // (`packageName` was the old shape — keep validating both for safety.)
  body('perApp.*.appId').optional().trim().isLength({ max: 200 }).withMessage('Invalid app id'),
  body('perApp.*.appName').optional().trim().isLength({ max: 200 }).withMessage('Invalid app name'),
  body('perApp.*.packageName').optional().trim().isLength({ max: 200 }).withMessage('Invalid package name'),
  body('perApp.*.limitMin').optional().isInt({ min: 0, max: 1440 }).withMessage('Per-app limit must be 0-1440 minutes'),
  // Schedule is an array of blocked time ranges, NOT an object. Each entry
  // is { days: int[0-6], startTime: "HH:mm", endTime: "HH:mm", blocked: bool }.
  body('schedule').optional().isArray({ max: 50 }).withMessage('schedule must be an array'),
  body('schedule.*.days').optional().isArray().withMessage('schedule.days must be an array of 0-6'),
  body('schedule.*.days.*').optional().isInt({ min: 0, max: 6 }).withMessage('schedule.days values must be 0-6'),
  body('schedule.*.startTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('startTime must be HH:mm'),
  body('schedule.*.endTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('endTime must be HH:mm'),
  body('schedule.*.blocked').optional().isBoolean().withMessage('schedule.blocked must be boolean'),
  // iOS: parent edits limit-rule metadata (merge-by-id patch; counts are device-owned)
  body('iosLimits').optional().isArray({ max: 50 }).withMessage('Too many iOS limit patches'),
  body('iosLimits.*.id').isString().withMessage('iosLimits.id must be a string')
    .trim().notEmpty().withMessage('iosLimits.id is required')
    .isLength({ max: 100 }).withMessage('iosLimits.id too long'),
  body('iosLimits.*.limitMin').optional().isInt({ min: 1, max: 1440 }).withMessage('iosLimits.limitMin must be 1-1440 minutes').toInt(),
  body('iosLimits.*.enabled').optional().isBoolean().withMessage('iosLimits.enabled must be boolean').toBoolean(),
  body('iosLimits.*.name').optional().isString().trim()
    .notEmpty().withMessage('iosLimits.name cannot be empty')
    .isLength({ max: 60 }).withMessage('iosLimits.name too long (max 60)'),
  checkValidation,
];

const appRules = [
  body('blockedApps').optional().isArray({ max: 500 }).withMessage('Too many blocked apps'),
  body('blockedApps.*').optional().trim().isLength({ max: 200 }),
  body('blockedCategories').optional().isArray({ max: 50 }),
  // iOS: parent toggles shielding of the child-picked FamilyActivitySelection
  body('iosBlockSelected').optional().isBoolean().withMessage('iosBlockSelected must be boolean').toBoolean(),
  // iOS: parent edits blocking-group metadata (merge-by-id patch; counts are device-owned)
  body('iosGroups').optional().isArray({ max: 50 }).withMessage('Too many iOS group patches'),
  body('iosGroups.*.id').isString().withMessage('iosGroups.id must be a string')
    .trim().notEmpty().withMessage('iosGroups.id is required')
    .isLength({ max: 100 }).withMessage('iosGroups.id too long'),
  body('iosGroups.*.enabled').optional().isBoolean().withMessage('iosGroups.enabled must be boolean').toBoolean(),
  body('iosGroups.*.name').optional().isString().trim()
    .notEmpty().withMessage('iosGroups.name cannot be empty')
    .isLength({ max: 60 }).withMessage('iosGroups.name too long (max 60)'),
  checkValidation,
];

// Child iOS device uploads its FamilyActivitySelection (opaque on-device tokens)
const IOS_SELECTION_BLOB_MAX = 200 * 1024;
const iosSelectionRules = [
  body('blob').optional({ nullable: true }).isString().withMessage('blob must be a base64 string')
    .isLength({ max: IOS_SELECTION_BLOB_MAX }).withMessage('blob too large (max 200KB)'),
  body('appCount').optional().isInt({ min: 0, max: 100000 }).withMessage('appCount must be a non-negative integer').toInt(),
  body('categoryCount').optional().isInt({ min: 0, max: 100000 }).withMessage('categoryCount must be a non-negative integer').toInt(),
  body('webDomainCount').optional().isInt({ min: 0, max: 100000 }).withMessage('webDomainCount must be a non-negative integer').toInt(),
  checkValidation,
];

// Child iOS device uploads its full blocking-group / limit-rule structure
// (metadata only — opaque Screen-Time tokens never leave the phone). The device
// is the source of truth: both arrays are required and replace stored state wholesale.
const iosStructureRules = [
  body('groups').isArray({ max: 50 }).withMessage('groups must be an array (max 50)'),
  body('groups.*.id').isString().withMessage('groups.id must be a string')
    .trim().notEmpty().withMessage('groups.id is required')
    .isLength({ max: 100 }).withMessage('groups.id too long'),
  body('groups.*.name').isString().withMessage('groups.name must be a string')
    .trim().isLength({ max: 60 }).withMessage('groups.name too long (max 60)'),
  body('groups.*.appCount').isInt({ min: 0, max: 10000 }).withMessage('groups.appCount must be 0-10000').toInt(),
  body('groups.*.categoryCount').isInt({ min: 0, max: 10000 }).withMessage('groups.categoryCount must be 0-10000').toInt(),
  body('groups.*.enabled').isBoolean().withMessage('groups.enabled must be boolean').toBoolean(),
  body('limits').isArray({ max: 50 }).withMessage('limits must be an array (max 50)'),
  body('limits.*.id').isString().withMessage('limits.id must be a string')
    .trim().notEmpty().withMessage('limits.id is required')
    .isLength({ max: 100 }).withMessage('limits.id too long'),
  body('limits.*.name').isString().withMessage('limits.name must be a string')
    .trim().isLength({ max: 60 }).withMessage('limits.name too long (max 60)'),
  body('limits.*.appCount').isInt({ min: 0, max: 10000 }).withMessage('limits.appCount must be 0-10000').toInt(),
  body('limits.*.categoryCount').isInt({ min: 0, max: 10000 }).withMessage('limits.categoryCount must be 0-10000').toInt(),
  body('limits.*.limitMin').isInt({ min: 0, max: 1440 }).withMessage('limits.limitMin must be 0-1440 minutes').toInt(),
  body('limits.*.enabled').isBoolean().withMessage('limits.enabled must be boolean').toBoolean(),
  checkValidation,
];

const webFilterRules = [
  body('mode').optional().isIn(['categories', 'allowlist']).withMessage("mode must be 'categories' or 'allowlist'"),
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
  iosSelectionRules,
  iosStructureRules,
  subscriptionActivate,
};
