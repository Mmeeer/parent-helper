const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  radiusMeters: {
    type: Number,
    required: true,
    default: 200,
  },
  alertOnEntry: {
    type: Boolean,
    default: true,
  },
  alertOnExit: {
    type: Boolean,
    default: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

geofenceSchema.index({ childId: 1, parentId: 1 });

module.exports = mongoose.model('Geofence', geofenceSchema);
