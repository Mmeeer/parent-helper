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
  deviceToken: {
    type: String,
    unique: true,
    sparse: true,
  },
}, { timestamps: true });

deviceSchema.index({ parentId: 1 });
deviceSchema.index({ childId: 1 });

deviceSchema.pre('save', function (next) {
  if (!this.pairingCode && !this.paired) {
    this.pairingCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.pairingExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
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
