const Alert = require('../models/Alert');

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
