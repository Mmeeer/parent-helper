const Device = require('../models/Device');
const Child = require('../models/Child');

exports.pair = async (req, res, next) => {
  try {
    const { childId } = req.body;

    // Verify child belongs to parent
    const child = await Child.findOne({ _id: childId, parentId: req.user._id });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const device = await Device.create({
      childId,
      parentId: req.user._id,
    });

    res.status(201).json({
      deviceId: device._id,
      pairingCode: device.pairingCode,
    });
  } catch (err) {
    next(err);
  }
};

exports.completePairing = async (req, res, next) => {
  try {
    const { pairingCode, platform, model, osVersion, appVersion } = req.body;

    const device = await Device.findOne({ pairingCode, paired: false });
    if (!device) {
      return res.status(404).json({ error: 'Invalid or expired pairing code' });
    }

    device.paired = true;
    device.platform = platform || 'android';
    device.model = model;
    device.osVersion = osVersion;
    device.appVersion = appVersion;
    device.status = 'online';
    device.lastSeen = new Date();
    await device.save();

    res.json({
      deviceId: device._id,
      childId: device.childId,
      parentId: device.parentId,
    });
  } catch (err) {
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Verify parent owns this device
    if (device.parentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: device._id,
      status: device.status,
      lastSeen: device.lastSeen,
      batteryLevel: device.batteryLevel,
      platform: device.platform,
      model: device.model,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
    });
  } catch (err) {
    next(err);
  }
};

exports.sendCommand = async (req, res, next) => {
  try {
    const { command, params } = req.body;
    const validCommands = ['lock', 'unlock', 'locate', 'sync'];

    if (!validCommands.includes(command)) {
      return res.status(400).json({ error: `Invalid command. Must be one of: ${validCommands.join(', ')}` });
    }

    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.parentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Push command to device via WebSocket
    const io = req.app.get('io');
    io.to(`device:${device._id}`).emit('command', { command, params });

    res.json({ message: `Command '${command}' sent to device` });
  } catch (err) {
    next(err);
  }
};

exports.heartbeat = async (req, res, next) => {
  try {
    const { deviceId, batteryLevel } = req.body;

    const device = await Device.findByIdAndUpdate(deviceId, {
      status: 'online',
      lastSeen: new Date(),
      batteryLevel,
    }, { new: true });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
};
