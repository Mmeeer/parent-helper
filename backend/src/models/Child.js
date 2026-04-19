const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    required: true,
    min: 1,
    max: 18,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  avatar: {
    type: String,
    default: null,
  },
}, { timestamps: true });

childSchema.index({ parentId: 1 });

// Cascade delete related documents when a child is removed
async function cascadeDeleteChild(childId) {
  const Device = mongoose.model('Device');
  const Rule = mongoose.model('Rule');
  const ActivityLog = mongoose.model('ActivityLog');
  const Alert = mongoose.model('Alert');
  const Geofence = mongoose.model('Geofence');

  await Promise.all([
    Device.deleteMany({ childId }),
    Rule.deleteMany({ childId }),
    ActivityLog.deleteMany({ childId }),
    Alert.deleteMany({ childId }),
    Geofence.deleteMany({ childId }),
  ]);
}

childSchema.pre('findOneAndDelete', async function () {
  const child = await this.model.findOne(this.getFilter()).select('_id');
  if (child) {
    await cascadeDeleteChild(child._id);
  }
});

childSchema.pre('deleteOne', { document: true, query: false }, async function () {
  await cascadeDeleteChild(this._id);
});

module.exports = mongoose.model('Child', childSchema);
