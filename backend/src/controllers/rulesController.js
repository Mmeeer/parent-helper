const Rule = require('../models/Rule');
const Child = require('../models/Child');
const Device = require('../models/Device');

// Verify child belongs to parent
const verifyChild = async (childId, parentId) => {
  const child = await Child.findOne({ _id: childId, parentId });
  return child;
};

const pushRulesToDevices = async (req, childId, rules) => {
  const io = req.app.get('io');
  const devices = await Device.find({ childId, paired: true });
  for (const device of devices) {
    io.to(`device:${device._id}`).emit('rules:updated', rules);
  }
};

exports.get = async (req, res, next) => {
  try {
    const { childId } = req.params;

    // Verify the authenticated device belongs to this child
    if (!req.device.childId || req.device.childId.toString() !== childId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const rules = await Rule.findOne({ childId });
    if (!rules) {
      return res.status(404).json({ error: 'Rules not found' });
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

    const { blockedApps } = req.body;

    const rules = await Rule.findOneAndUpdate(
      { childId },
      { $set: { blockedApps } },
      { new: true, upsert: true },
    );

    await pushRulesToDevices(req, childId, rules);

    res.json(rules);
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
