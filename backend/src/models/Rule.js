const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    unique: true,
  },
  screenTime: {
    dailyLimitMin: {
      type: Number,
      default: 120,
    },
    perApp: [{
      appId: String,
      appName: String,
      limitMin: Number,
    }],
    schedule: [{
      days: [{ type: Number, min: 0, max: 6 }], // 0=Sunday
      startTime: String, // "HH:mm"
      endTime: String,   // "HH:mm"
      blocked: { type: Boolean, default: true },
    }],
  },
  blockedApps: [String],
  webFilter: {
    categories: {
      type: [String],
      default: ['adult', 'gambling', 'violence'],
    },
    customBlock: [String],
    customAllow: [String],
  },
  // ── iOS (Screen Time / FamilyControls) ────────────────────────────────────
  // Parent toggle: when true the child iOS app shields whatever is in iosSelection.
  iosBlockSelected: {
    type: Boolean,
    default: false,
  },
  // Opaque FamilyActivitySelection chosen on the child device via FamilyActivityPicker.
  // Apple's app tokens are only meaningful on-device, so we store the encoded blob
  // (base64, ~<=200KB) plus counts for the parent UI. Written by the child device
  // (POST /rules/:childId/ios-selection); Android ignores it.
  iosSelection: {
    blob: { type: String, default: null, maxlength: 200 * 1024 },
    appCount: { type: Number, default: 0 },
    categoryCount: { type: Number, default: 0 },
    webDomainCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model('Rule', ruleSchema);
