const Device = require('../models/Device');
const Alert = require('../models/Alert');

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without heartbeat
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

function startOfflineDetector(io) {
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

      // Find devices that are marked online but haven't sent a heartbeat recently
      const staleDevices = await Device.find({
        paired: true,
        status: 'online',
        lastSeen: { $lt: cutoff },
      }).populate('childId', 'name');

      for (const device of staleDevices) {
        device.status = 'offline';
        await device.save();

        // Create alert for the parent
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

        // Push real-time notification to parent
        io.to(`parent:${device.parentId}`).emit('alert', alert);
      }

      if (staleDevices.length > 0) {
        console.log(`[OfflineDetector] Marked ${staleDevices.length} device(s) as offline`);
      }
    } catch (err) {
      console.error('[OfflineDetector] Error:', err.message);
    }
  }, CHECK_INTERVAL_MS);
}

module.exports = { startOfflineDetector };
