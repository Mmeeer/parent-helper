const Alert = require('../models/Alert');
const Rule = require('../models/Rule');
const Device = require('../models/Device');

exports.pending = async (req, res, next) => {
  try {
    const approvals = await Alert.find({
      parentId: req.user._id,
      type: 'new_app_installed',
      'data.status': 'pending',
    })
      .sort({ createdAt: -1 })
      .populate('childId', 'name');

    res.json(approvals);
  } catch (err) {
    next(err);
  }
};

exports.decide = async (req, res, next) => {
  try {
    const { action } = req.body; // 'approve' or 'block'

    if (!['approve', 'block'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "block"' });
    }

    const alert = await Alert.findOne({
      _id: req.params.id,
      parentId: req.user._id,
      type: 'new_app_installed',
    });

    if (!alert) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    alert.data = { ...alert.data, status: action === 'approve' ? 'approved' : 'blocked' };
    alert.read = true;
    await alert.save();

    const io = req.app.get('io');
    const devices = await Device.find({ childId: alert.childId, paired: true });

    if (action === 'block' && alert.data.packageName) {
      // Add to blocked apps list
      await Rule.findOneAndUpdate(
        { childId: alert.childId },
        { $addToSet: { blockedApps: alert.data.packageName } },
      );

      // Push updated rules to device (app stays suspended)
      const rules = await Rule.findOne({ childId: alert.childId });
      for (const device of devices) {
        io.to(`device:${device._id}`).emit('rules:updated', rules);
      }
      io.to(`parent:${req.user._id}`).emit('rules:updated', rules);
    } else if (action === 'approve' && alert.data.packageName) {
      // Unsuspend the app on the child's device
      for (const device of devices) {
        io.to(`device:${device._id}`).emit('app:unsuspend', { packageName: alert.data.packageName });
      }
    }

    res.json({ message: `App ${action === 'approve' ? 'approved' : 'blocked'}`, alert });
  } catch (err) {
    next(err);
  }
};
