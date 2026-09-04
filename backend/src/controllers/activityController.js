const ActivityLog = require('../models/ActivityLog');
const Child = require('../models/Child');
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { sendBatchAlertNotifications } = require('../services/pushNotification');

// Throttle location points: drop points that are <50m from previous and <60s apart.
// This cuts API/storage costs while keeping meaningful movement data.
const MIN_DISTANCE_METERS = 50;
const MIN_INTERVAL_MS = 60 * 1000;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function throttleLocations(points) {
  if (!points || points.length === 0) return [];
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const dist = haversineMeters(prev.lat, prev.lng, curr.lat, curr.lng);
    const dt = Math.abs(new Date(curr.timestamp) - new Date(prev.timestamp));
    // Keep point if moved enough OR enough time passed (5 min cap)
    if (dist >= MIN_DISTANCE_METERS || dt >= 5 * MIN_INTERVAL_MS) {
      result.push(curr);
    }
  }
  return result;
}

exports.sync = async (req, res, next) => {
  try {
    // Use authenticated device identity instead of trusting request body
    const childId = req.device.childId;
    const deviceId = req.device._id;
    const { date, apps, web, location: rawLocation, blockedAttempts, screenTime } = req.body;

    // Throttle location points to reduce storage and API costs
    const location = throttleLocations(rawLocation);

    // Upsert: for apps use $set (child sends full daily snapshot each sync),
    // for web/location/blockedAttempts use $push (discrete events that accumulate)
    // `apps` may be missing/empty (iOS cannot report per-app usage) — only $set when it is an array.
    const update = {};
    const setFields = {};
    if (Array.isArray(apps)) {
      setFields.apps = apps;
    }
    // Optional screen-time summary (iOS DeviceActivityMonitor):
    // { limitReachedAt, shieldEvents, usedMinutes }
    const maxFields = {};
    if (screenTime && typeof screenTime === 'object') {
      if (screenTime.limitReachedAt) {
        const t = new Date(screenTime.limitReachedAt);
        if (!Number.isNaN(t.getTime())) setFields['screenTime.limitReachedAt'] = t;
      }
      if (typeof screenTime.shieldEvents === 'number' && Number.isFinite(screenTime.shieldEvents)) {
        setFields['screenTime.shieldEvents'] = Math.max(0, Math.floor(screenTime.shieldEvents));
      }
      // usedMinutes is a running daily total sent by the device, so it overwrites rather
      // than accumulates — but via $max so an out-of-order or reset report from the device
      // can never lower the total we already recorded for the day.
      if (typeof screenTime.usedMinutes === 'number' && Number.isFinite(screenTime.usedMinutes)) {
        maxFields['screenTime.usedMinutes'] = Math.min(1440, Math.max(0, Math.floor(screenTime.usedMinutes)));
      }
    }
    if (Object.keys(setFields).length > 0) {
      update.$set = setFields;
    }
    if (Object.keys(maxFields).length > 0) {
      update.$max = maxFields;
    }
    const pushFields = {};
    if (web) pushFields.web = { $each: web };
    if (location && location.length > 0) pushFields.location = { $each: location };
    if (blockedAttempts) pushFields.blockedAttempts = { $each: blockedAttempts };
    if (Object.keys(pushFields).length > 0) {
      update.$push = pushFields;
    }

    const log = await ActivityLog.findOneAndUpdate(
      { childId, deviceId, date },
      update,
      { new: true, upsert: true },
    );

    // Update device last seen
    await Device.findByIdAndUpdate(deviceId, {
      status: 'online',
      lastSeen: new Date(),
    });

    // Emit real-time location if present + check geofences
    let geofenceStates = {};
    if (location && location.length > 0) {
      const device = await Device.findById(deviceId);
      if (device) {
        const io = req.app.get('io');
        const lastLoc = location[location.length - 1];
        io.to(`parent:${device.parentId}`).emit('location:update', {
          childId,
          location: lastLoc,
        });

        // Check geofence triggers for ALL location points to catch exits between syncs
        const { checkLocations } = require('./geofenceController');
        geofenceStates = await checkLocations(childId, location, io);
      }
    }

    // Generate alerts for blocked attempts and new app installs
    if (blockedAttempts && blockedAttempts.length > 0) {
      const device = await Device.findById(deviceId);
      if (device) {
        const alerts = blockedAttempts.map((attempt) => {
          // New app installs get a separate alert type for the approval flow
          if (attempt.type === 'new_app') {
            // attempt.target is appName, attempt.packageName is the package (if provided)
            const appName = attempt.target || 'Unknown App';
            return {
              parentId: device.parentId,
              childId,
              type: 'new_app_installed',
              message: `New app installed: ${appName}`,
              data: { appName, packageName: attempt.packageName || appName, status: 'pending', timestamp: attempt.timestamp },
            };
          }
          // Uninstall attempts get their own alert type
          if (attempt.type === 'uninstall_attempt') {
            return {
              parentId: device.parentId,
              childId,
              type: 'uninstall_attempt',
              message: `Uninstall attempt detected on ${device.model || 'device'}`,
              data: { deviceId: device._id, timestamp: attempt.timestamp },
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

        // Send push notification
        try {
          await sendBatchAlertNotifications(device.parentId, alerts);
        } catch (err) {
          console.error('[Activity] Push notification error:', err.message);
        }
      }
    }

    res.json({ status: 'synced', id: log._id, geofenceStates });
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
      let appMinutes = 0;
      for (const app of (log.apps || [])) {
        appMinutes += app.durationMin || 0;
        if (!appUsage[app.packageName]) {
          appUsage[app.packageName] = { packageName: app.packageName, appName: app.appName, durationMin: 0 };
        }
        appUsage[app.packageName].durationMin += app.durationMin || 0;
      }
      // iOS never sends per-app usage, only a screenTime.usedMinutes total, so take
      // whichever source reports more for this log.
      totalScreenTimeMin += Math.max(appMinutes, (log.screenTime && log.screenTime.usedMinutes) || 0);
      // iOS sends a day counter of shield hits (no per-attempt docs unless the child
      // asked the parent); Android pushes per-attempt entries. Take the larger.
      totalBlocked += Math.max((log.blockedAttempts || []).length, (log.screenTime && log.screenTime.shieldEvents) || 0);
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

    let locations = logs
      .flatMap((log) => log.location || [])
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Nothing today (device asleep, offline overnight, or just paired): fall back to the
    // most recent day that does have fixes, so the parent still sees a last known position
    // instead of an empty map.
    if (locations.length === 0) {
      const lastLog = await ActivityLog.findOne({
        childId,
        'location.0': { $exists: true },
      }).sort({ date: -1 });
      if (lastLog) {
        locations = (lastLog.location || [])
          .slice()
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .slice(-1); // just the last known point, clearly stale
      }
    }

    res.json(locations);
  } catch (err) {
    next(err);
  }
};

// GET /activity/:childId/daily-breakdown?days=7
exports.dailyBreakdown = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const days = parseInt(req.query.days) || 7;

    const child = await Child.findOne({ _id: childId, parentId: req.user._id });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (days - 1));
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];

    const logs = await ActivityLog.find({
      childId,
      date: { $gte: startStr, $lte: endStr },
    }).sort({ date: 1 });

    const breakdown = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLogs = logs.filter((l) => l.date === dateStr);

      let screenTimeMin = 0;
      let blocked = 0;
      let webVisits = 0;

      for (const log of dayLogs) {
        let appMinutes = 0;
        for (const app of (log.apps || [])) {
          appMinutes += app.durationMin || 0;
        }
        // iOS reports only screenTime.usedMinutes (no per-app breakdown available).
        screenTimeMin += Math.max(appMinutes, (log.screenTime && log.screenTime.usedMinutes) || 0);
        blocked += Math.max((log.blockedAttempts || []).length, (log.screenTime && log.screenTime.shieldEvents) || 0);
        webVisits += (log.web || []).length;
      }

      breakdown.push({ date: dateStr, screenTimeMin, blocked, webVisits });
    }

    res.json({ childId, days, breakdown });
  } catch (err) {
    next(err);
  }
};
