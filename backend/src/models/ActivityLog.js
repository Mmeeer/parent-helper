const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
  },
  date: {
    type: String, // "YYYY-MM-DD"
    required: true,
  },
  apps: [{
    packageName: String,
    appName: String,
    durationMin: Number,
  }],
  web: [{
    url: String,
    timestamp: Date,
    blocked: { type: Boolean, default: false },
  }],
  location: [{
    lat: Number,
    lng: Number,
    timestamp: Date,
  }],
  blockedAttempts: [{
    // 'web_filter' = Android VPN/DNS filter hit; 'shield' = iOS ManagedSettings shield shown
    type: { type: String, enum: ['app', 'web', 'new_app', 'uninstall_attempt', 'web_filter', 'shield'] },
    target: String,
    timestamp: Date,
  }],
  // Optional daily screen-time summary (iOS DeviceActivityMonitor reports these
  // instead of per-app usage, which Apple does not expose to the app).
  screenTime: {
    limitReachedAt: { type: Date, default: null },
    shieldEvents: { type: Number, default: 0 },
    // Minutes of managed-app usage reported by the iOS child app (running daily total).
    usedMinutes: { type: Number, default: 0 },
  },
}, { timestamps: true });

activityLogSchema.index({ childId: 1, date: -1 });
activityLogSchema.index({ deviceId: 1, date: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
