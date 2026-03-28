const { validationResult } = require('express-validator');
const Child = require('../models/Child');
const Rule = require('../models/Rule');
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const ActivityLog = require('../models/ActivityLog');
const Geofence = require('../models/Geofence');
const User = require('../models/User');
const SubscriptionKey = require('../models/SubscriptionKey');

exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check subscription limits
    const user = await User.findById(req.user._id).populate('subscriptionKey');
    const sub = user.subscriptionKey;
    if (!sub || sub.status !== 'active') {
      return res.status(403).json({ error: 'Active subscription required to add children. Please activate a subscription key.' });
    }
    if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
      await SubscriptionKey.findByIdAndUpdate(sub._id, { status: 'expired' });
      return res.status(403).json({ error: 'Your subscription has expired. Please activate a new key.' });
    }

    const currentKids = await Child.countDocuments({ parentId: req.user._id });
    if (currentKids >= sub.maxKids) {
      return res.status(403).json({ error: `You can have up to ${sub.maxKids} children with your current subscription.` });
    }

    const { name, age, avatar } = req.body;
    const child = await Child.create({
      name,
      age,
      avatar,
      parentId: req.user._id,
    });

    // Create default rules for the child
    await Rule.create({ childId: child._id });

    res.status(201).json(child);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const children = await Child.find({ parentId: req.user._id });
    res.json(children);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const child = await Child.findOneAndUpdate(
      { _id: req.params.id, parentId: req.user._id },
      req.body,
      { new: true, runValidators: true },
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json(child);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const child = await Child.findOneAndDelete({
      _id: req.params.id,
      parentId: req.user._id,
    });

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Cascade delete all associated data
    const childId = child._id;
    await Promise.all([
      Rule.deleteOne({ childId }),
      Device.deleteMany({ childId }),
      Alert.deleteMany({ childId }),
      ActivityLog.deleteMany({ childId }),
      Geofence.deleteMany({ childId }),
    ]);

    res.json({ message: 'Child profile and all associated data removed' });
  } catch (err) {
    next(err);
  }
};
