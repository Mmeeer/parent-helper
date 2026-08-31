const mongoose = require('mongoose');

// Simple key/value store for app-wide settings editable from the admin panel
// (legal terms text, tutorial video URL, ...). Keys are dot-namespaced strings
// like 'terms.parent'. Values are Mixed so terms can be long HTML/markdown
// strings; the admin endpoint whitelists keys and validates values.
const appSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, { timestamps: true }); // timestamps gives us updatedAt

// Convenience: fetch several keys as a { key: value } map (missing keys → undefined)
appSettingSchema.statics.getMap = async function (keys) {
  const docs = await this.find({ key: { $in: keys } }).lean();
  const map = {};
  for (const doc of docs) map[doc.key] = doc;
  return map;
};

module.exports = mongoose.model('AppSetting', appSettingSchema);
