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
}, { timestamps: true });

deviceSchema.index({ parentId: 1 });
deviceSchema.index({ childId: 1 });

deviceSchema.pre('save', function (next) {
  if (!this.pairingCode) {
    this.pairingCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Device', deviceSchema);
