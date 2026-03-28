const mongoose = require('mongoose');
const crypto = require('crypto');

const subscriptionKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  maxKids: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
  },
  durationMonths: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['unused', 'active', 'expired'],
    default: 'unused',
  },
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  activatedAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  note: {
    type: String,
    default: '',
  },
}, { timestamps: true });

subscriptionKeySchema.index({ status: 1 });
// One key per parent — only one active key can reference a given user
subscriptionKeySchema.index({ activatedBy: 1 }, { unique: true, sparse: true });

// Generate a readable key like "PK-XXXX-XXXX"
subscriptionKeySchema.statics.generateKey = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
  const seg = () => Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `PK-${seg()}-${seg()}`;
};

// Add N months to a date
subscriptionKeySchema.statics.addMonths = function (date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

module.exports = mongoose.model('SubscriptionKey', subscriptionKeySchema);
