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
// One key per parent — only one *activated* key can reference a given user.
// MUST use partialFilterExpression (not sparse) because the schema defaults
// activatedBy to null; sparse skips only missing fields, so null values still
// collide on the unique index and every key creation after the first fails
// with E11000. partialFilterExpression with $type:"objectId" indexes only rows
// that actually have a user assigned.
subscriptionKeySchema.index(
  { activatedBy: 1 },
  { unique: true, partialFilterExpression: { activatedBy: { $type: "objectId" } } },
);

// Generate a readable key like "PK-XXXX-XXXX" (or custom prefix)
subscriptionKeySchema.statics.generateKey = function (prefix = 'PK') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
  const seg = () => Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `${prefix.toUpperCase()}-${seg()}-${seg()}`;
};

// Add N months to a date
subscriptionKeySchema.statics.addMonths = function (date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

module.exports = mongoose.model('SubscriptionKey', subscriptionKeySchema);
