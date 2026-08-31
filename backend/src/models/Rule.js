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
    // iOS filtering strategy: block by category lists vs. allowlist-only browsing.
    mode: { type: String, enum: ['categories', 'allowlist'], default: 'categories' },
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
  // Named blocking groups managed on the child iOS device. The opaque Screen-Time
  // tokens stay on the phone — the backend stores only metadata (name/counts/enabled)
  // so the parent app can list groups and toggle/rename them remotely. Structure is
  // uploaded wholesale by the device (POST /rules/:childId/ios-structure).
  iosGroups: [{
    id: String,
    name: String,
    appCount: Number,
    categoryCount: Number,
    enabled: Boolean,
  }],
  // Per-app/category time-limit rules managed on the child iOS device. Same
  // metadata-only model as iosGroups. Do NOT confuse with screenTime.perApp,
  // which Android uses. Served to the iOS client under the JSON key `iosPerApp`
  // in the device rules GET (the shipped client decodes that name).
  iosLimits: [{
    id: String,
    name: String,
    appCount: Number,
    categoryCount: Number,
    limitMin: Number,
    enabled: Boolean,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Rule', ruleSchema);
