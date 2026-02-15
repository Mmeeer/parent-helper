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
}, { timestamps: true });

module.exports = mongoose.model('Rule', ruleSchema);
