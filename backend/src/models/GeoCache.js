const mongoose = require('mongoose');

const geoCacheSchema = new mongoose.Schema({
  // Rounded coordinates as cache key (5 decimal places ≈ 1.1m precision)
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  cachedAt: { type: Date, default: Date.now },
}, { timestamps: false });

// Compound unique index for fast lookups — one entry per coordinate pair
geoCacheSchema.index({ lat: 1, lng: 1 }, { unique: true });

// Auto-expire after 90 days — addresses rarely change
geoCacheSchema.index({ cachedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('GeoCache', geoCacheSchema);
