const Device = require('../models/Device');

const deviceAuth = async (req, res, next) => {
  const token = req.header('X-Device-Token');
  if (!token) {
    return res.status(401).json({ error: 'No device token provided' });
  }

  try {
    const device = await Device.findOne({ deviceToken: token, paired: true });
    if (!device) {
      return res.status(401).json({ error: 'Invalid device token' });
    }
    req.device = device;

    // Any authenticated call is proof of life: iOS wakes the child app for
    // location updates / background refresh without opening a socket, so
    // relying on sockets or explicit heartbeats alone shows devices "offline"
    // while they are actually reporting. Throttle to one write per 60s and
    // fire-and-forget so no latency is added to the request.
    const STALE_MS = 60 * 1000;
    if (!device.lastSeen || Date.now() - device.lastSeen.getTime() > STALE_MS) {
      Device.updateOne(
        { _id: device._id },
        { $set: { status: 'online', lastSeen: new Date() } },
      ).catch(() => {});
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = deviceAuth;
