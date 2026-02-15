const mongoose = require('mongoose');

const contentFilterSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'adult', 'gambling', 'violence', 'drugs', 'weapons',
      'hate', 'malware', 'phishing', 'social_media', 'gaming', 'streaming',
    ],
  },
}, { timestamps: true });

contentFilterSchema.index({ category: 1 });

module.exports = mongoose.model('ContentFilter', contentFilterSchema);
