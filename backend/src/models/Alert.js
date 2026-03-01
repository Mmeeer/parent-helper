const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'screen_time_limit',
      'new_app_installed',
      'blocked_content',
      'geofence_trigger',
      'device_offline',
      'unusual_pattern',
      'uninstall_attempt',
    ],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

alertSchema.index({ parentId: 1, createdAt: -1 });
alertSchema.index({ parentId: 1, read: 1 });

module.exports = mongoose.model('Alert', alertSchema);
