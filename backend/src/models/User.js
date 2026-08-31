const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    // Optional since phone-first auth: new accounts register with a phone number
    // and may omit email. Uniqueness is enforced by the sparse index declared
    // below (see DEPLOY NOTE) — do NOT store `email: null`; leave the field
    // unset so the sparse unique index skips the document (sparse indexes skip
    // MISSING fields only; an explicit null is indexed and would collide).
    type: String,
    required: false,
    lowercase: true,
    trim: true,
  },
  phone: {
    // Phone-first auth: required at registration for NEW accounts (enforced in
    // the route validator, not here — schema-level `required` would break old
    // accounts created before phones existed). Stored normalized (spaces and
    // dashes stripped). As with email, never store null — leave unset.
    type: String,
    required: false,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subscriptionKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionKey',
    default: null,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  refreshToken: {
    type: String,
  },
  tokenFamily: {
    type: String,
    default: null,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  fcmTokens: [{
    token: { type: String, required: true },
    deviceId: { type: String },
    platform: { type: String, enum: ['ios', 'android'], default: 'android' },
    updatedAt: { type: Date, default: Date.now },
  }],
  alertSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  resetCode: {
    type: String,
    default: null,
  },
  resetCodeExpiresAt: {
    type: Date,
    default: null,
  },
  deletionRequestedAt: {
    type: Date,
    default: null,
  },
  deletionReason: {
    type: String,
    default: null,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationCode: {
    type: String,
    default: null,
  },
  emailVerificationCodeExpiresAt: {
    type: Date,
    default: null,
  },
  // Set when the parent accepted the Terms of Service at registration
  // (register endpoint receives `acceptedTerms: true`).
  termsAcceptedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// ── Unique indexes ──────────────────────────────────────────────────────────
// DEPLOY NOTE (index migration): the old schema declared `email` as
// `unique: true` WITHOUT sparse, so production has a non-sparse `email_1`
// index. Mongoose will NOT convert it automatically — on deploy you may need:
//   db.users.dropIndex('email_1')
// and let Mongoose recreate it sparse (or create it manually:
//   db.users.createIndex({ email: 1 }, { unique: true, sparse: true })).
// Also, sparse indexes still index explicit nulls — before building the phone
// index, unset legacy null values or the build fails with duplicate-null
// E11000s:
//   db.users.updateMany({ phone: null },  { $unset: { phone: '' } })
//   db.users.updateMany({ email: null },  { $unset: { email: '' } })
// Application code never writes null for these fields (it omits them instead),
// and the register controller handles residual E11000 races gracefully.
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
