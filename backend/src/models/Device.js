const mongoose = require('mongoose');
const crypto = require('crypto');

const deviceSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    default: null,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  platform: {
    type: String,
    enum: ['android', 'ios'],
    default: 'android',
  },
  model: {
    type: String,
    default: null,
  },
  osVersion: {
    type: String,
    default: null,
  },
  pairingCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  pairingExpiresAt: {
    type: Date,
    default: null,
  },
  paired: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline',
  },
  lastSeen: {
    type: Date,
    default: null,
  },
  batteryLevel: {
    type: Number,
    default: null,
  },
  appVersion: {
    type: String,
    default: null,
  },
  // iOS only: whether the child granted FamilyControls (Screen Time) authorisation.
  // null = never reported by the device (e.g. Android, or an older child build).
  screenTimeAuthorized: {
    type: Boolean,
    default: null,
  },
  deviceToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  // FCM registration token of the child device itself (iOS: APNs→FCM via Firebase Messaging).
  // Used to deliver silent "command" pushes when the Socket.IO connection is not alive
  // (iOS suspends sockets in background). Android child app currently uses sockets only.
  pushToken: {
    type: String,
    default: null,
  },
  pushTokenUpdatedAt: {
    type: Date,
    default: null,
  },
  // Set when the child device accepted the Terms of Service during pairing
  // (completePairing receives `acceptedTerms: true`).
  termsAcceptedAt: {
    type: Date,
    default: null,
  },
  installedApps: [{
    packageName: { type: String, required: true },
    appName: { type: String, required: true },
    // Optional small base64-encoded PNG (no data: prefix), 64x64 from the
    // child app. Used by the parent app to render real icons in the
    // block-app picker. Stored alongside the app entry so the parent
    // doesn't need to fetch icons separately.
    iconBase64: { type: String, default: null },
    installedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

deviceSchema.index({ parentId: 1 });
deviceSchema.index({ childId: 1 });

deviceSchema.pre('save', function (next) {
  if (!this.pairingCode && !this.paired) {
    this.pairingCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.pairingExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
  }
  next();
});

// Create a device with retry on pairing code collision
deviceSchema.statics.createWithUniquePairingCode = async function (data, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await this.create(data);
    } catch (err) {
      if (err.code === 11000 && err.keyPattern && err.keyPattern.pairingCode) {
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to generate a unique pairing code. Please try again.');
};

module.exports = mongoose.model('Device', deviceSchema);
