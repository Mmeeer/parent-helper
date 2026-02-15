const ActivityLog = require('../models/ActivityLog');
const Child = require('../models/Child');
const Device = require('../models/Device');
const Alert = require('../models/Alert');

exports.sync = async (req, res, next) => {
  try {
    // Use authenticated device identity instead of trusting request body
    const childId = req.device.childId;
    const deviceId = req.device._id;
    const { date, apps, web, location, blockedAttempts } = req.body;

    // Upsert: merge activity for the same child+device+date
    const log = await ActivityLog.findOneAndUpdate(
      { childId, deviceId, date },
      {
        $push: {
          ...(apps && { apps: { $each: apps } }),
          ...(web && { web: { $each: web } }),
          ...(location && { location: { $each: location } }),
          ...(blockedAttempts && { blockedAttempts: { $each: blockedAttempts } }),
        },
      },
      { new: true, upsert: true },
    );

    // Update device last seen
    await Device.findByIdAndUpdate(deviceId, {
      status: 'online',
      lastSeen: new Date(),
    });

    // Emit real-time location if present
    if (location && location.length > 0) {
      const device = await Device.findById(deviceId);
      if (device) {
        const io = req.app.get('io');
        io.to(`parent:${device.parentId}`).emit('location:update', {
          childId,
          location: location[location.length - 1],
        });
      }
    }

    // Generate alerts for blocked attempts and new app installs
    if (blockedAttempts && blockedAttempts.length > 0) {
      const device = await Device.findById(deviceId);
      if (device) {
        const alerts = blockedAttempts.map((attempt) => {
          // New app installs get a separate alert type for the approval flow
          if (attempt.type === 'new_app') {
            return {
              parentId: device.parentId,
              childId,
              type: 'new_app_installed',
              message: `New app installed: ${attempt.target}`,
              data: { packageName: attempt.target, status: 'pending', timestamp: attempt.timestamp },
            };
          }
          return {
            parentId: device.parentId,
            childId,
            type: 'blocked_content',
            message: `Blocked ${attempt.type}: ${attempt.target}`,
            data: attempt,
          };
        });
        await Alert.insertMany(alerts);

        const io = req.app.get('io');
        for (const alert of alerts) {
          io.to(`parent:${device.parentId}`).emit('alert:new', alert);
        }
      }
    }

    res.json({ status: 'synced', id: log._id });
  } catch (err) {
    next(err);
  }
};

exports.summary = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const { period } = req.query; // 'day', 'week', 'month'

    // Verify parent owns child
    const child = await Child.findOne({ _id: childId, parentId: req.user._id });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let startDate;
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0];
    } else if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
    } else {
      startDate = today;
    }

    const logs = await ActivityLog.find({
      childId,
      date: { $gte: startDate, $lte: today },
    }).sort({ date: -1 });

    // Aggregate
    let totalScreenTimeMin = 0;
    const appUsage = {};
    let totalBlocked = 0;
    let totalWebVisits = 0;

    for (const log of logs) {
      for (const app of (log.apps || [])) {
        totalScreenTimeMin += app.durationMin || 0;
        if (!appUsage[app.packageName]) {
          appUsage[app.packageName] = { packageName: app.packageName, appName: app.appName, durationMin: 0 };
        }
        appUsage[app.packageName].durationMin += app.durationMin || 0;
      }
      totalBlocked += (log.blockedAttempts || []).length;
      totalWebVisits += (log.web || []).length;
    }

    res.json({
      childId,
      period: period || 'day',
      totalScreenTimeMin,
      totalBlocked,
      totalWebVisits,
      topApps: Object.values(appUsage).sort((a, b) => b.durationMin - a.durationMin).slice(0, 10),
      daysTracked: logs.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.apps = async (req, res, next) => {
  try {
    const { childId } = req.params;

    const child = await Child.findOne({ _id: childId, parentId: req.user._id });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const logs = await ActivityLog.find({
      childId,
      date: { $gte: today },
    });

    const appUsage = {};
    for (const log of logs) {
      for (const app of (log.apps || [])) {
        if (!appUsage[app.packageName]) {
          appUsage[app.packageName] = { packageName: app.packageName, appName: app.appName, durationMin: 0 };
        }
        appUsage[app.packageName].durationMin += app.durationMin || 0;
      }
    }

    res.json(Object.values(appUsage).sort((a, b) => b.durationMin - a.durationMin));
  } catch (err) {
    next(err);
  }
};

exports.web = async (req, res, next) => {
  try {
    const { childId } = req.params;

    const child = await Child.findOne({ _id: childId, parentId: req.user._id });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const logs = await ActivityLog.find({
      childId,
      date: { $gte: today },
    });

    const webHistory = logs.flatMap((log) => log.web || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(webHistory);
  } catch (err) {
    next(err);
  }
};

exports.location = async (req, res, next) => {
  try {
    const { childId } = req.params;

    const child = await Child.findOne({ _id: childId, parentId: req.user._id });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const logs = await ActivityLog.find({
      childId,
      date: { $gte: today },
    });

    const locations = logs.flatMap((log) => log.location || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(locations);
  } catch (err) {
    next(err);
  }
};
