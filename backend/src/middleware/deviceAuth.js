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
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = deviceAuth;
