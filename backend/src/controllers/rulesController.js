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
  webFilter: { categories: ['adult', 'gambling', 'violence'], customBlock: [], customAllow: [] },
  iosBlockSelected: false,
  iosSelection: { blob: null, appCount: 0, categoryCount: 0, webDomainCount: 0, updatedAt: null },
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

    res.json(rules);
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

exports.setScreenTime = async (req, res, next) => {
  try {
    const { childId } = req.params;

    const child = await verifyChild(childId, req.user._id);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { dailyLimitMin, perApp, schedule } = req.body;

    const rules = await Rule.findOneAndUpdate(
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

    const { blockedApps, iosBlockSelected } = req.body;

    const $set = {};
    if (blockedApps !== undefined) $set.blockedApps = blockedApps;
    // iOS: parent toggles shielding of the child-picked FamilyActivitySelection.
    if (typeof iosBlockSelected === 'boolean') $set.iosBlockSelected = iosBlockSelected;

    const rules = await Rule.findOneAndUpdate(
      { childId },
      { $set },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

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

exports.setWebFilter = async (req, res, next) => {
  try {
    const { childId } = req.params;

    const child = await verifyChild(childId, req.user._id);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { categories, customBlock, customAllow } = req.body;

    const rules = await Rule.findOneAndUpdate(
      { childId },
      {
        $set: {
          'webFilter.categories': categories,
          'webFilter.customBlock': customBlock,
          'webFilter.customAllow': customAllow,
        },
      },
      { new: true, upsert: true },
    );

    await pushRulesToDevices(req, childId, rules);

    res.json(rules);
  } catch (err) {
    next(err);
  }
};
