const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { sendAlertNotification } = require('../services/pushNotification');

// Platform-aware: Android runs a persistent foreground service and heartbeats every ~15 min;
// iOS heartbeats are opportunistic (BGAppRefresh) — iOS devices are NOT offline just because
// the OS delayed a background wakeup. A 5-minute threshold made every iOS device flap
// offline/online and spam "went offline" alerts.
const OFFLINE_THRESHOLD_ANDROID_MS = 20 * 60 * 1000; // ~2 missed heartbeats
const OFFLINE_THRESHOLD_IOS_MS = 60 * 60 * 1000;     // BGAppRefresh cadence is OS-controlled
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

function startOfflineDetector(io) {
  const intervalId = setInterval(async () => {
    try {
      const cutoffAndroid = new Date(Date.now() - OFFLINE_THRESHOLD_ANDROID_MS);
      const cutoffIos = new Date(Date.now() - OFFLINE_THRESHOLD_IOS_MS);

      const staleDevices = await Device.find({
        paired: true,
        status: 'online',
        $or: [
          {
            platform: 'ios',
            lastSeen: { $lt: cutoffIos },
            // The DeviceActivity beacon may be fresher than lastSeen right after a
            // wake-up gap — an active child is not an offline device.
            $and: [{ $or: [{ lastActivityAt: null }, { lastActivityAt: { $lt: cutoffIos } }] }],
          },
          { platform: { $ne: 'ios' }, lastSeen: { $lt: cutoffAndroid } },
        ],
      }).populate('childId', 'name');

      for (const device of staleDevices) {
        device.status = 'offline';
        await device.save();

        // Skip if an offline alert was already created for this device within cooldown
        const OFFLINE_ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
        const existingAlert = await Alert.findOne({
          parentId: device.parentId,
          childId: device.childId?._id || device.childId,
          type: 'device_offline',
          'data.deviceId': device._id,
          createdAt: { $gte: new Date(Date.now() - OFFLINE_ALERT_COOLDOWN_MS) },
        });
        if (existingAlert) continue;

        const alert = await Alert.create({
          parentId: device.parentId,
          childId: device.childId?._id || device.childId,
          type: 'device_offline',
          message: `${device.model || 'Device'} went offline`,
          data: {
            deviceId: device._id,
            lastSeen: device.lastSeen,
          },
        });

        io.to(`parent:${device.parentId}`).emit('alert:new', alert);
        try {
          await sendAlertNotification(device.parentId, alert);
        } catch (err) {
          console.error(`[OfflineDetector] Push notification error for device ${device._id}:`, err.message);
        }
      }

      if (staleDevices.length > 0) {
        console.log(`[OfflineDetector] Marked ${staleDevices.length} device(s) as offline`);
      }
    } catch (err) {
      console.error('[OfflineDetector] Error:', err.message);
    }
  }, CHECK_INTERVAL_MS);

  return intervalId;
}

module.exports = { startOfflineDetector };
