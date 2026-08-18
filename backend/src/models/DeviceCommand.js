const mongoose = require('mongoose');

// Persisted parent→child command. Socket.IO + silent push are the primary delivery
// paths; this queue is the REST fallback for iOS, where the app is frequently
// suspended and may miss both. The child polls GET /devices/commands (e.g. on
// BGAppRefresh / foreground) and acks each command it has executed.
const COMMANDS = ['lock', 'unlock', 'locate', 'sync', 'unpair', 'rules:updated'];
const TTL_MS = 24 * 60 * 60 * 1000;

const deviceCommandSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true,
  },
  command: {
    type: String,
    enum: COMMANDS,
    required: true,
  },
  params: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: ['pending', 'acked'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  ackedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + TTL_MS),
  },
});

deviceCommandSchema.index({ deviceId: 1, status: 1, createdAt: 1 });
// TTL: MongoDB removes the document once expiresAt has passed.
deviceCommandSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

deviceCommandSchema.statics.COMMANDS = COMMANDS;

module.exports = mongoose.model('DeviceCommand', deviceCommandSchema);
