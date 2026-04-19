const crypto = require('crypto');
const Device = require('../models/Device');
const Child = require('../models/Child');
const { sendAlertNotification } = require('../services/pushNotification');

exports.pair = async (req, res, next) => {
  try {
    const { childId } = req.body;
    console.log('[PAIR] Request received:', { childId, parentId: req.user?._id });

    if (!childId) {
      console.log('[PAIR] ERROR: No childId provided');
      return res.status(400).json({ error: 'childId is required' });
    }

    // Verify child belongs to parent
    const child = await Child.findOne({ _id: childId, parentId: req.user._id });
    if (!child) {
      console.log('[PAIR] ERROR: Child not found or does not belong to parent:', { childId, parentId: req.user._id });
      return res.status(404).json({ error: 'Child not found' });
    }
    console.log('[PAIR] Child verified:', child.name);

    // One device per kid — check if child already has a paired device
    const existingDevice = await Device.findOne({ childId, paired: true });
    if (existingDevice) {
      return res.status(409).json({ error: 'This child already has a paired device. Unpair the current device first.' });
    }

    // Clean up expired unpaired devices for this child to free up pairing codes
    const cleaned = await Device.deleteMany({
      childId,
      paired: false,
      pairingExpiresAt: { $lt: new Date() },
    });
    if (cleaned.deletedCount > 0) {
      console.log('[PAIR] Cleaned up', cleaned.deletedCount, 'expired unpaired devices');
    }

    const device = await Device.createWithUniquePairingCode({
      childId,
      parentId: req.user._id,
    });
    console.log('[PAIR] SUCCESS: Device created with pairing code:', device.pairingCode, 'expires:', device.pairingExpiresAt);

    const expiresIn = Math.max(0, Math.floor((device.pairingExpiresAt - Date.now()) / 1000));
    res.status(201).json({
      deviceId: device._id,
      pairingCode: device.pairingCode,
      expiresAt: device.pairingExpiresAt,
      expiresIn,
    });
  } catch (err) {
    console.error('[PAIR] ERROR:', err.message, err.code ? `(code: ${err.code})` : '');
    next(err);
  }
};

exports.completePairing = async (req, res, next) => {
  try {
    const { pairingCode, platform, model, osVersion, appVersion } = req.body;
    console.log('[COMPLETE-PAIRING] Request received:', { pairingCode, platform, model, osVersion, appVersion });

    if (!pairingCode || typeof pairingCode !== 'string') {
      console.log('[COMPLETE-PAIRING] ERROR: Missing or invalid pairing code');
      return res.status(400).json({ error: 'Pairing code is required' });
    }

    const normalizedCode = pairingCode.trim().toUpperCase();
    console.log('[COMPLETE-PAIRING] Looking up code:', normalizedCode);

    // Debug: show all unpaired devices
    const allUnpaired = await Device.find({ paired: false }).select('pairingCode pairingExpiresAt');
    console.log('[COMPLETE-PAIRING] All unpaired devices in DB:', allUnpaired.map(d => ({
      code: d.pairingCode,
      expires: d.pairingExpiresAt,
      expired: d.pairingExpiresAt ? d.pairingExpiresAt < new Date() : 'no-expiry',
    })));

    const device = await Device.findOne({ pairingCode: normalizedCode, paired: false });
    if (!device) {
      console.log('[COMPLETE-PAIRING] ERROR: No device found with code:', normalizedCode);
      return res.status(404).json({ error: 'Invalid or expired pairing code' });
    }
    console.log('[COMPLETE-PAIRING] Device found:', { deviceId: device._id, childId: device.childId });

    // Check if pairing code has expired
    if (device.pairingExpiresAt && device.pairingExpiresAt < new Date()) {
      console.log('[COMPLETE-PAIRING] ERROR: Code expired at:', device.pairingExpiresAt, 'now:', new Date());
      return res.status(410).json({ error: 'Pairing code has expired. Please generate a new one.' });
    }

    device.paired = true;
    device.platform = platform || 'android';
    device.model = model;
    device.osVersion = osVersion;
    device.appVersion = appVersion;
    device.status = 'online';
    device.lastSeen = new Date();
    device.deviceToken = crypto.randomBytes(32).toString('hex');
    // Clear pairing code after successful pairing to free up the unique index slot
    device.pairingCode = null;
    device.pairingExpiresAt = null;

    console.log('[COMPLETE-PAIRING] Saving paired device...');
    await device.save();
    console.log('[COMPLETE-PAIRING] SUCCESS: Device paired!', { deviceId: device._id, childId: device.childId, parentId: device.parentId });

    res.json({
      deviceId: device._id,
      childId: device.childId,
      parentId: device.parentId,
      deviceToken: device.deviceToken,
    });
  } catch (err) {
    console.error('[COMPLETE-PAIRING] ERROR:', err.message, err.code ? `(code: ${err.code})` : '', err.stack);
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
    const room = `device:${device._id}`;
    const sockets = await io.in(room).fetchSockets();
    console.log(`[COMMAND] Sending '${command}' to room ${room} (${sockets.length} socket(s) in room)`);

    if (sockets.length === 0) {
      console.log('[COMMAND] WARNING: No sockets in device room — device may not be connected');
    }

    io.to(room).emit('command', { command, params });

    res.json({ message: `Command '${command}' sent to device` });
  } catch (err) {
    console.error('[COMMAND] ERROR:', err.message);
    next(err);
  }
};

exports.listByChild = async (req, res, next) => {
  try {
    const { childId } = req.params;

    // Verify child belongs to parent
    const child = await Child.findOne({ _id: childId, parentId: req.user._id });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const devices = await Device.find({ childId, paired: true })
      .select('_id status lastSeen batteryLevel platform model osVersion appVersion')
      .sort({ lastSeen: -1 });

    res.json(devices.map((d) => ({
      id: d._id,
      status: d.status,
      lastSeen: d.lastSeen,
      batteryLevel: d.batteryLevel,
      platform: d.platform,
      model: d.model,
      osVersion: d.osVersion,
      appVersion: d.appVersion,
    })));
  } catch (err) {
    next(err);
  }
};

exports.unpair = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.parentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const ActivityLog = require('../models/ActivityLog');
    await Promise.all([
      Device.findByIdAndDelete(req.params.id),
      ActivityLog.deleteMany({ deviceId: device._id }),
    ]);
    res.json({ message: 'Device unpaired and associated data removed' });
  } catch (err) {
    next(err);
  }
};

// POST /devices/sync-apps — child device syncs its installed apps list
exports.syncInstalledApps = async (req, res, next) => {
  try {
    const { apps } = req.body; // [{ packageName, appName }]
    if (!Array.isArray(apps)) {
      return res.status(400).json({ error: 'apps array is required' });
    }

    req.device.installedApps = apps.map(a => ({
      packageName: a.packageName,
      appName: a.appName,
      installedAt: a.installedAt || new Date(),
    }));
    await req.device.save();

    res.json({ status: 'ok', count: req.device.installedApps.length });
  } catch (err) {
    next(err);
  }
};

// GET /devices/:id/installed-apps — parent gets installed apps on a child device
exports.getInstalledApps = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    if (device.parentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(device.installedApps || []);
  } catch (err) {
    next(err);
  }
};

// POST /devices/sos — child sends emergency SOS alert to parent
exports.sos = async (req, res, next) => {
  try {
    const Alert = require('../models/Alert');
    const device = req.device;
    const { message, lat, lng } = req.body;

    const child = await Child.findById(device.childId);
    const childName = child ? child.name : 'Your child';

    const alert = await Alert.create({
      parentId: device.parentId,
      childId: device.childId,
      type: 'sos',
      message: message || `SOS alert from ${childName}!`,
      data: {
        deviceId: device._id,
        model: device.model,
        lat: lat || null,
        lng: lng || null,
        timestamp: new Date().toISOString(),
      },
    });

    // Notify parent in real-time via socket
    const io = req.app.get('io');
    io.to(`parent:${device.parentId}`).emit('alert:sos', {
      id: alert._id,
      childId: device.childId,
      childName,
      message: alert.message,
      data: alert.data,
      createdAt: alert.createdAt,
    });

    // Send push notification (SOS is high priority)
    sendAlertNotification(device.parentId, alert);

    console.log(`[SOS] Alert sent from device ${device._id} for child ${childName}`);
    res.json({ status: 'sent', alertId: alert._id });
  } catch (err) {
    console.error('[SOS] ERROR:', err.message);
    next(err);
  }
};

// POST /devices/report-permission — child reports a critical permission change
exports.reportPermission = async (req, res, next) => {
  try {
    const Alert = require('../models/Alert');
    const device = req.device;
    const { permission, granted } = req.body;

    if (!permission) {
      return res.status(400).json({ error: 'permission field is required' });
    }

    if (granted) {
      // Permission restored — no alert needed
      return res.json({ status: 'ok' });
    }

    // Prevent alert spam: only create if no unread alert of same type exists for this child
    const recentAlert = await Alert.findOne({
      parentId: device.parentId,
      childId: device.childId,
      type: 'overlay_permission_revoked',
      read: false,
    });

    if (recentAlert) {
      return res.json({ status: 'already_reported' });
    }

    const child = await Child.findById(device.childId);
    const childName = child ? child.name : 'Your child';

    const alert = await Alert.create({
      parentId: device.parentId,
      childId: device.childId,
      type: 'overlay_permission_revoked',
      message: `Screen time enforcement cannot work on ${childName}'s device. The "Display over other apps" permission has been revoked.`,
      data: {
        deviceId: device._id,
        model: device.model,
        permission,
        timestamp: new Date().toISOString(),
      },
    });

    // Notify parent in real-time
    const io = req.app.get('io');
    io.to(`parent:${device.parentId}`).emit('alert:new', {
      id: alert._id,
      type: alert.type,
      childId: device.childId,
      childName,
      message: alert.message,
      data: alert.data,
      createdAt: alert.createdAt,
    });

    sendAlertNotification(device.parentId, alert);

    console.log(`[PERMISSION] Overlay permission revoked on device ${device._id} for child ${childName}`);
    res.json({ status: 'reported', alertId: alert._id });
  } catch (err) {
    console.error('[PERMISSION] ERROR:', err.message);
    next(err);
  }
};

exports.heartbeat = async (req, res, next) => {
  try {
    const { batteryLevel } = req.body;

    req.device.status = 'online';
    req.device.lastSeen = new Date();
    req.device.batteryLevel = batteryLevel;
    await req.device.save();

    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
};
