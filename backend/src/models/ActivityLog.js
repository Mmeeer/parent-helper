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
    type: { type: String, enum: ['app', 'web', 'new_app'] },
    target: String,
    timestamp: Date,
  }],
}, { timestamps: true });

activityLogSchema.index({ childId: 1, date: -1 });
activityLogSchema.index({ deviceId: 1, date: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
