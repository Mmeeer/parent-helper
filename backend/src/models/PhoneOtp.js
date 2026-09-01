const mongoose = require('mongoose');

// One active code per phone+purpose. Codes are stored hashed; the TTL index
// removes expired docs automatically.
const phoneOtpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  purpose: { type: String, enum: ['register', 'login', 'reset'], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentCount: { type: Number, default: 1 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

phoneOtpSchema.index({ phone: 1, purpose: 1 }, { unique: true });
phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PhoneOtp', phoneOtpSchema);
