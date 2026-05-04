const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { sendAlertNotification } = require('../services/pushNotification');

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without heartbeat
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

function startOfflineDetector(io) {
  const intervalId = setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

      const staleDevices = await Device.find({
        paired: true,
        status: 'online',
        lastSeen: { $lt: cutoff },
      }).populate('childId', 'name');

      for (const device of staleDevices) {
        device.status = 'offline';
        await device.save();

        // Skip if an unread offline alert already exists for this device
        const existingAlert = await Alert.findOne({
          parentId: device.parentId,
          childId: device.childId?._id || device.childId,
          type: 'device_offline',
          'data.deviceId': device._id,
          read: false,
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
