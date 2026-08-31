const Device = require('../models/Device');
const { sendDeviceCommand } = require('../services/pushNotification');

// iOS "online while the phone is in use" beacon, part 2 of the trick:
// the child's DeviceActivity extension stamps activity into the App Group but has no
// network access. A periodic silent push gives the app a wake-up window in which it
// heartbeats and uploads that stamp. We only ping devices that have gone quiet, so
// the push budget Apple gives each app is spent where it matters.
const PING_INTERVAL_MS = 5 * 60 * 1000;      // check every 5 minutes
const QUIET_AFTER_MS = 8 * 60 * 1000;        // ping devices silent for > 8 minutes
const GIVE_UP_AFTER_MS = 24 * 60 * 60 * 1000; // don't ping devices dead for > 24h

function startDevicePinger() {
  return setInterval(async () => {
    try {
      const now = Date.now();
      const devices = await Device.find({
        paired: true,
        platform: 'ios',
        pushToken: { $ne: null },
        lastSeen: {
          $lt: new Date(now - QUIET_AFTER_MS),
          $gt: new Date(now - GIVE_UP_AFTER_MS),
        },
      }).select('_id pushToken platform').limit(200);

      for (const device of devices) {
        // 'sync' makes the wake useful: heartbeat + activity + location all upload.
        sendDeviceCommand(device, 'sync').catch(() => {});
      }
      if (devices.length > 0) {
        console.log(`[DevicePinger] Pinged ${devices.length} quiet iOS device(s)`);
      }
    } catch (err) {
      console.error('[DevicePinger] Error:', err.message);
    }
  }, PING_INTERVAL_MS);
}

module.exports = { startDevicePinger };
