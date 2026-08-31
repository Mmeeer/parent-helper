const crypto = require('crypto');
const Device = require('../models/Device');
const DeviceCommand = require('../models/DeviceCommand');
const Child = require('../models/Child');
const User = require('../models/User');
const SubscriptionKey = require('../models/SubscriptionKey');
const { sendAlertNotification, sendDeviceCommand } = require('../services/pushNotification');
const { isReviewEmail, reviewEmail, reviewDemoCode } = require('../utils/reviewAccess');

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

    // App-store review account: skip the subscription/expiry/device-cap 402s
    // so a reviewer driving the parent app can always generate a pairing code.
    // Inert unless REVIEW_ACCOUNT_EMAIL is set.
    if (!isReviewEmail(req.user && req.user.email)) {
      // Subscription device cap: total paired devices per parent must not exceed maxKids
      const user = await User.findById(req.user._id).populate('subscriptionKey');
      const sub = user && user.subscriptionKey;
      if (!sub || sub.status !== 'active') {
        return res.status(402).json({ error: 'Active subscription required to pair devices.' });
      }
      if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
        await SubscriptionKey.findByIdAndUpdate(sub._id, { status: 'expired' });
        return res.status(402).json({ error: 'Your subscription has expired. Please activate a new key.' });
      }
      const pairedDeviceCount = await Device.countDocuments({ parentId: req.user._id, paired: true });
      if (pairedDeviceCount >= sub.maxKids) {
        return res.status(402).json({ error: `Device limit reached. Your plan allows up to ${sub.maxKids} device(s).` });
      }
    }

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
    const { pairingCode, platform, model, osVersion, appVersion, acceptedTerms } = req.body;
    console.log('[COMPLETE-PAIRING] Request received:', { pairingCode, platform, model, osVersion, appVersion, acceptedTerms });

    if (!pairingCode || typeof pairingCode !== 'string') {
      console.log('[COMPLETE-PAIRING] ERROR: Missing or invalid pairing code');
      return res.status(400).json({ error: 'Pairing code is required' });
    }

    const normalizedCode = pairingCode.trim().toUpperCase();
    console.log('[COMPLETE-PAIRING] Looking up code:', normalizedCode);

    // ── App-store review demo code ──────────────────────────────────────────
    // A fixed, REUSABLE pairing code that drops the single reviewer device
    // straight into the review account's seeded demo child — no parent app, no
    // second device, no subscription/expiry gate. The code is matched purely
    // from env (never stored as a Device.pairingCode), so it is never consumed
    // and works for every reviewer / every retry. It can ONLY ever target the
    // review account's own demo child, so a leaked code cannot monitor a real
    // family. Entirely inert unless REVIEW_DEMO_PAIRING_CODE + the review
    // account exist (delete the env var post-approval to disable).
    const demoCode = reviewDemoCode();
    if (demoCode && normalizedCode === demoCode) {
      const reviewer = await User.findOne({ email: reviewEmail() });
      const demoChild = reviewer
        ? await Child.findOne({ parentId: reviewer._id }).sort({ createdAt: 1 })
        : null;
      if (!reviewer || !demoChild) {
        console.log('[COMPLETE-PAIRING] Demo code used but review account/child not seeded');
        return res.status(404).json({ error: 'Invalid or expired pairing code' });
      }

      let device = await Device.findOne({
        childId: demoChild._id, parentId: reviewer._id, paired: true,
      });
      if (!device) {
        device = new Device({ childId: demoChild._id, parentId: reviewer._id, paired: true });
      }
      device.paired = true;
      device.platform = platform || 'android';
      device.model = model || 'Review Demo Device';
      device.osVersion = osVersion || null;
      device.appVersion = appVersion || null;
      device.status = 'online';
      device.lastSeen = new Date();
      device.deviceToken = crypto.randomBytes(32).toString('hex');
      if (acceptedTerms === true) device.termsAcceptedAt = new Date();
      device.pairingCode = undefined;
      device.pairingExpiresAt = undefined;
      await device.save();

      console.log('[COMPLETE-PAIRING] SUCCESS via review demo code:', {
        deviceId: device._id, childId: demoChild._id,
      });
      const io = req.app.get('io');
      if (io) {
        io.to(`parent:${device.parentId}`).emit('device:paired', {
          deviceId: String(device._id),
          childId: String(device.childId),
          model: device.model || null,
        });
      }
      return res.json({
        deviceId: device._id,
        childId: device.childId,
        parentId: device.parentId,
        deviceToken: device.deviceToken,
      });
    }

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
    // Child app may confirm ToS acceptance during pairing
    if (acceptedTerms === true) device.termsAcceptedAt = new Date();
    // Remove the pairing code so the sparse unique index ignores this doc.
    // NOTE: must use `undefined` (which Mongoose translates to `$unset`), not
    // `null`. Sparse indexes still include null-valued documents, so setting
    // these to null would cause E11000 collisions on the next successful pair.
    device.pairingCode = undefined;
    device.pairingExpiresAt = undefined;

    console.log('[COMPLETE-PAIRING] Saving paired device...');
    await device.save();
    console.log('[COMPLETE-PAIRING] SUCCESS: Device paired!', { deviceId: device._id, childId: device.childId, parentId: device.parentId });

    // Notify the parent in real-time so the PairDevice screen can pop the
    // child detail page automatically — without this the parent has to
    // refresh manually to know pairing succeeded.
    const io = req.app.get('io');
    if (io) {
      io.to(`parent:${device.parentId}`).emit('device:paired', {
        deviceId: String(device._id),
        childId: String(device.childId),
        model: device.model || null,
      });
    }

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
      screenTimeAuthorized: device.screenTimeAuthorized,
      lastActivityAt: device.lastActivityAt ?? null,
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

    // iOS (and any device that registered a push token): also deliver as a silent push so the
    // command arrives while the app is suspended in background.
    let pushed = false;
    if (device.pushToken) {
      pushed = await sendDeviceCommand(device, command, params);
    }

    // Persist to the command queue so a child that missed both the socket emit and the
    // push (iOS suspended) still picks it up via GET /devices/commands. Non-fatal.
    let queued = false;
    try {
      await DeviceCommand.create({ deviceId: device._id, command, params: params || {} });
      queued = true;
    } catch (queueErr) {
      console.error('[COMMAND] Failed to queue command:', queueErr.message);
    }

    res.json({
      message: `Command '${command}' sent to device`,
      viaSocket: sockets.length > 0,
      viaPush: pushed,
      queued,
    });
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
      .select('_id status lastSeen batteryLevel platform model osVersion appVersion screenTimeAuthorized')
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
      screenTimeAuthorized: d.screenTimeAuthorized,
      lastActivityAt: d.lastActivityAt ?? null,
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

    // Tell the child app it's been unpaired BEFORE we delete the record so
    // the child can wipe its local state and return to the pairing screen.
    // Without this the child keeps using a now-invalid deviceToken and looks
    // "still paired" on its end. Fire-and-forget; the device may be offline.
    const io = req.app.get('io');
    if (io) {
      io.to(`device:${device._id}`).emit('device:unpaired', {
        deviceId: String(device._id),
        reason: 'unpaired_by_parent',
      });
    }
    if (device.pushToken) {
      await sendDeviceCommand(device, 'unpair', { reason: 'unpaired_by_parent' });
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

// GET /devices/commands — child device fetches its pending (un-acked) commands, oldest first.
// REST fallback for iOS when the socket emit / silent push was missed.
exports.listCommands = async (req, res, next) => {
  try {
    const commands = await DeviceCommand.find({
      deviceId: req.device._id,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    res.json(commands.map((c) => ({
      id: c._id,
      command: c.command,
      params: c.params || {},
      createdAt: c.createdAt,
    })));
  } catch (err) {
    next(err);
  }
};

// POST /devices/commands/:id/ack — child device marks a queued command as executed
exports.ackCommand = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid command id' });
    }
    const cmd = await DeviceCommand.findOneAndUpdate(
      { _id: id, deviceId: req.device._id, status: 'pending' },
      { $set: { status: 'acked', ackedAt: new Date() } },
      { new: true },
    );
    if (!cmd) {
      // Not found, already acked, or belongs to another device — all resolve to 404
      // (idempotent for the client: nothing pending under that id).
      return res.status(404).json({ error: 'Command not found' });
    }
    res.json({ status: 'ok', id: cmd._id, ackedAt: cmd.ackedAt });
  } catch (err) {
    next(err);
  }
};

// POST /devices/push-token — child device registers its FCM registration token
// Body: { token: string, platform?: 'ios'|'android' }
exports.registerPushToken = async (req, res, next) => {
  try {
    const { token, platform } = req.body || {};
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
      return res.status(400).json({ error: 'Invalid push token' });
    }
    const update = { pushToken: token, pushTokenUpdatedAt: new Date() };
    if (platform === 'ios' || platform === 'android') update.platform = platform;
    // A token belongs to exactly one device: clear it from any other device first.
    await Device.updateMany({ pushToken: token, _id: { $ne: req.device._id } }, { $set: { pushToken: null } });
    await Device.updateOne({ _id: req.device._id }, { $set: update });
    res.json({ status: 'ok' });
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
      iconBase64: a.iconBase64 || null,
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
        childName,
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
    try {
      await sendAlertNotification(device.parentId, alert);
    } catch (err) {
      console.error('[SOS] Push notification error:', err.message);
    }

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

    // Prevent alert spam: only create if no alert of same type exists for this child within cooldown
    const PERMISSION_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
    const recentAlert = await Alert.findOne({
      parentId: device.parentId,
      childId: device.childId,
      type: 'overlay_permission_revoked',
      createdAt: { $gte: new Date(Date.now() - PERMISSION_COOLDOWN_MS) },
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

    try {
      await sendAlertNotification(device.parentId, alert);
    } catch (err) {
      console.error('[PERMISSION] Push notification error:', err.message);
    }

    console.log(`[PERMISSION] Overlay permission revoked on device ${device._id} for child ${childName}`);
    res.json({ status: 'reported', alertId: alert._id });
  } catch (err) {
    console.error('[PERMISSION] ERROR:', err.message);
    next(err);
  }
};

exports.heartbeat = async (req, res, next) => {
  try {
    const { batteryLevel, screenTimeAuthorized, lastActiveAt } = req.body;

    req.device.status = 'online';
    req.device.lastSeen = new Date();
    req.device.batteryLevel = batteryLevel;
    // Optional: iOS child app reports its FamilyControls (Screen Time) authorisation
    // state so the parent app can prompt when it has been revoked. Only persist when
    // the device actually sent a boolean — otherwise keep the last known value.
    if (typeof screenTimeAuthorized === 'boolean') {
      req.device.screenTimeAuthorized = screenTimeAuthorized;
    }
    if (lastActiveAt && !Number.isNaN(Date.parse(lastActiveAt))) {
      const d = new Date(lastActiveAt);
      // Monotonic: never move the activity stamp backwards.
      if (!req.device.lastActivityAt || d > req.device.lastActivityAt) {
        req.device.lastActivityAt = d;
      }
    }
    await req.device.save();

    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
};
