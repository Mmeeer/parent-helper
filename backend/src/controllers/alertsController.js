const Alert = require('../models/Alert');
const User = require('../models/User');

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { unreadOnly } = req.query;

    const filter = { parentId: req.user._id };
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('childId', 'name');

    const total = await Alert.countDocuments(filter);

    res.json({
      alerts,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, parentId: req.user._id },
      { read: true },
      { new: true },
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Alert.updateMany(
      { parentId: req.user._id, read: false },
      { read: true },
    );

    res.json({ message: 'All alerts marked as read' });
  } catch (err) {
    next(err);
  }
};

// GET /alerts/settings — Get alert preferences
exports.getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('alertSettings');
    res.json(user?.alertSettings || {
      screen_time_limit: true,
      new_app_installed: true,
      blocked_content: true,
      geofence_trigger: true,
      device_offline: true,
      unusual_pattern: true,
      uninstall_attempt: true,
      pushEnabled: true,
    });
  } catch (err) {
    next(err);
  }
};

// POST /alerts/settings — Update alert preferences
exports.updateSettings = async (req, res, next) => {
  try {
    const settings = req.body;

    await User.findByIdAndUpdate(req.user._id, {
      $set: { alertSettings: settings },
    });

    res.json({ message: 'Alert settings updated', settings });
  } catch (err) {
    next(err);
  }
};
