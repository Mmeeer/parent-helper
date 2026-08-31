const Rule = require('../models/Rule');
const Child = require('../models/Child');
const Device = require('../models/Device');
const { sendDeviceCommand } = require('../services/pushNotification');

// Verify child belongs to parent
const verifyChild = async (childId, parentId) => {
  const child = await Child.findOne({ _id: childId, parentId });
  return child;
};

// Shape returned when a child has no Rule document yet. Shared by the device
// GET (iOS polls for config and must always get a body) and the parent view.
const defaultRules = (childId) => ({
  childId,
  screenTime: { dailyLimitMin: 120, perApp: [], schedule: [] },
  blockedApps: [],
  webFilter: { categories: ['adult', 'gambling', 'violence'], customBlock: [], customAllow: [], mode: 'categories' },
  iosBlockSelected: false,
  iosSelection: { blob: null, appCount: 0, categoryCount: 0, webDomainCount: 0, updatedAt: null },
  iosGroups: [],
  iosLimits: [],
});

const pushRulesToDevices = async (req, childId, rules) => {
  const io = req.app.get('io');
  const devices = await Device.find({ childId, paired: true });
  for (const device of devices) {
    io.to(`device:${device._id}`).emit('rules:updated', rules);
    // Silent push so a backgrounded (iOS) child app re-fetches rules.
    if (device.pushToken) sendDeviceCommand(device, 'rules:updated').catch(() => {});
  }
  // Also notify the parent app so screens showing rules refresh in real-time
  io.to(`parent:${req.user._id}`).emit('rules:updated', rules);
};

exports.get = async (req, res, next) => {
  try {
    const { childId } = req.params;

    // Verify the authenticated device belongs to this child
    if (!req.device.childId || req.device.childId.toString() !== childId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let rules = await Rule.findOne({ childId });
    if (!rules) {
      // Return defaults (not 404) so a device polling for config always gets a body.
      rules = defaultRules(childId);
    }

    // Shipped iOS client decodes the limit rules under the key `iosPerApp`,
    // so alias iosLimits there (keep iosLimits too for newer clients).
    const body = typeof rules.toObject === 'function' ? rules.toObject() : { ...rules };
    body.iosPerApp = body.iosLimits || [];

    res.json(body);
  } catch (err) {
    next(err);
  }
};

// Parent-auth: parent views rules for their child
exports.getForParent = async (req, res, next) => {
  try {
    const { childId } = req.params;

    const child = await verifyChild(childId, req.user._id);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    let rules = await Rule.findOne({ childId });
    if (!rules) {
      // Return defaults if no rules set yet
      rules = defaultRules(childId);
    }

    res.json(rules);
  } catch (err) {
    next(err);
  }
};

// Merge parent-sent patches into a device-owned iOS metadata array (iosGroups /
// iosLimits). Patches match by id; only enabled/name (and limitMin for limits)
// may change. Unknown ids are ignored, counts are never touched. Saves and
// returns the rule doc when anything changed.
const mergeIosMetadata = async (rules, targetArray, patches, { allowLimitMin = false } = {}) => {
  if (!Array.isArray(patches) || patches.length === 0 || !Array.isArray(targetArray)) return rules;

  const byId = new Map();
  for (const p of patches) {
    if (p && typeof p.id === 'string') byId.set(p.id, p);
  }

  let changed = false;
  for (const entry of targetArray) {
    const patch = byId.get(entry.id);
    if (!patch) continue; // unknown/unmatched ids ignored
    if (typeof patch.enabled === 'boolean') {
      entry.enabled = patch.enabled;
      changed = true;
    }
    if (typeof patch.name === 'string' && patch.name.trim().length > 0) {
      entry.name = patch.name.trim().slice(0, 60);
      changed = true;
    }
    if (allowLimitMin && Number.isInteger(patch.limitMin) && patch.limitMin >= 1 && patch.limitMin <= 1440) {
      entry.limitMin = patch.limitMin;
      changed = true;
    }
  }

  if (changed && typeof rules.save === 'function') {
    rules.markModified('iosGroups');
    rules.markModified('iosLimits');
    rules = await rules.save();
  }
  return rules;
};

exports.setScreenTime = async (req, res, next) => {
  try {
    const { childId } = req.params;

    const child = await verifyChild(childId, req.user._id);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { dailyLimitMin, perApp, schedule, iosLimits } = req.body;

    let rules = await Rule.findOneAndUpdate(
      { childId },
      {
        $set: {
          'screenTime.dailyLimitMin': dailyLimitMin,
          'screenTime.perApp': perApp,
          'screenTime.schedule': schedule,
        },
      },
      { new: true, upsert: true },
    );

    // iOS: merge limit-rule patches by id. Only limitMin/enabled/name may change;
    // counts stay device-owned and unknown ids are ignored (device is the source
    // of truth for structure).
    rules = await mergeIosMetadata(rules, rules.iosLimits, iosLimits, { allowLimitMin: true });

    await pushRulesToDevices(req, childId, rules);

    res.json(rules);
  } catch (err) {
    next(err);
  }
};

exports.setApps = async (req, res, next) => {
  try {
    const { childId } = req.params;

    const child = await verifyChild(childId, req.user._id);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { blockedApps, iosBlockSelected, iosGroups } = req.body;

    const $set = {};
    if (blockedApps !== undefined) $set.blockedApps = blockedApps;
    // iOS: parent toggles shielding of the child-picked FamilyActivitySelection.
    if (typeof iosBlockSelected === 'boolean') $set.iosBlockSelected = iosBlockSelected;

    let rules = await Rule.findOneAndUpdate(
      { childId },
      { $set },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // iOS: merge blocking-group patches by id (enabled/name only; counts device-owned).
    rules = await mergeIosMetadata(rules, rules.iosGroups, iosGroups);

    await pushRulesToDevices(req, childId, rules);

    res.json(rules);
  } catch (err) {
    next(err);
  }
};

// Device-auth (iOS): child device uploads the FamilyActivitySelection the parent
// picked on-device. Apple's tokens are opaque off-device, so we store the encoded
// blob + counts and let the parent app render "N apps, M categories" and toggle
// iosBlockSelected. Body: { blob, appCount, categoryCount, webDomainCount }.
exports.setIosSelection = async (req, res, next) => {
  try {
    const { childId } = req.params;

    if (!req.device.childId || req.device.childId.toString() !== childId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { blob, appCount, categoryCount, webDomainCount } = req.body || {};

    const rules = await Rule.findOneAndUpdate(
      { childId },
      {
        $set: {
          'iosSelection.blob': typeof blob === 'string' && blob.length > 0 ? blob : null,
          'iosSelection.appCount': Number.isInteger(appCount) ? appCount : 0,
          'iosSelection.categoryCount': Number.isInteger(categoryCount) ? categoryCount : 0,
          'iosSelection.webDomainCount': Number.isInteger(webDomainCount) ? webDomainCount : 0,
          'iosSelection.updatedAt': new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Let the parent app refresh its rules screens in real-time.
    const io = req.app.get('io');
    if (io) {
      io.to(`parent:${req.device.parentId}`).emit('rules:updated', rules);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
};

// Device-auth (iOS): child device uploads its full blocking-group / limit-rule
// structure (metadata only — the opaque Screen-Time tokens stay on the phone).
// The device is the source of truth, so iosGroups/iosLimits are replaced
// wholesale. Body: { groups: [...], limits: [...] } (validated upstream).
exports.setIosStructure = async (req, res, next) => {
  try {
    const { childId } = req.params;

    if (!req.device.childId || req.device.childId.toString() !== childId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { groups, limits } = req.body;

    // Keep only the known keys (validator already checked types/ranges).
    const iosGroups = groups.map((g) => ({
      id: g.id,
      name: g.name,
      appCount: g.appCount,
      categoryCount: g.categoryCount,
      enabled: g.enabled,
    }));
    const iosLimits = limits.map((l) => ({
      id: l.id,
      name: l.name,
      appCount: l.appCount,
      categoryCount: l.categoryCount,
      limitMin: l.limitMin,
      enabled: l.enabled,
    }));

    const rules = await Rule.findOneAndUpdate(
      { childId },
      { $set: { iosGroups, iosLimits } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Notify the parent app only. Do NOT emit to the device room: the device just
    // told us this state, and an emit would loop (upload -> emit -> refetch -> upload...).
    const io = req.app.get('io');
    if (io) {
      io.to(`parent:${req.device.parentId}`).emit('rules:updated', rules);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
};

exports.setWebFilter = async (req, res, next) => {
  try {
    const { childId } = req.params;

    const child = await verifyChild(childId, req.user._id);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { categories, customBlock, customAllow, mode } = req.body;

    const $set = {
      'webFilter.categories': categories,
      'webFilter.customBlock': customBlock,
      'webFilter.customAllow': customAllow,
    };
    // iOS: filtering strategy toggle (validator restricts to 'categories'|'allowlist').
    if (mode !== undefined) $set['webFilter.mode'] = mode;

    const rules = await Rule.findOneAndUpdate(
      { childId },
      { $set },
      { new: true, upsert: true },
    );

    await pushRulesToDevices(req, childId, rules);

    res.json(rules);
  } catch (err) {
    next(err);
  }
};
