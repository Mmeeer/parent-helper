const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const emailVerified = require('../middleware/emailVerified');
const SubscriptionKey = require('../models/SubscriptionKey');
const User = require('../models/User');
const { subscriptionActivate } = require('../middleware/validate');
const Child = require('../models/Child');

// GET /subscription — Get current subscription status
router.get('/', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('subscriptionKey').lean();
    const sub = user.subscriptionKey;

    if (!sub) {
      return res.json({ active: false, subscription: null });
    }

    // Check expiry
    const now = new Date();
    if (sub.status === 'active' && sub.expiresAt && new Date(sub.expiresAt) < now) {
      await SubscriptionKey.findByIdAndUpdate(sub._id, { status: 'expired' });
      sub.status = 'expired';
    }

    const childrenCount = await Child.countDocuments({ parentId: req.user._id });

    res.json({
      active: sub.status === 'active',
      subscription: {
        key: sub.key,
        maxKids: sub.maxKids,
        currentKids: childrenCount,
        expiresAt: sub.expiresAt,
        activatedAt: sub.activatedAt,
        durationMonths: sub.durationMonths,
        status: sub.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /subscription/activate — Activate a subscription key
router.post('/activate', auth, emailVerified, subscriptionActivate, async (req, res, next) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Subscription key is required' });
    }

    const normalizedKey = key.trim().toUpperCase();
    const subKey = await SubscriptionKey.findOne({ key: normalizedKey });

    if (!subKey) {
      return res.status(404).json({ error: 'Invalid subscription key' });
    }

    if (subKey.status === 'active') {
      return res.status(409).json({ error: 'This key is already activated by another user' });
    }

    if (subKey.status === 'expired') {
      return res.status(410).json({ error: 'This key has expired' });
    }

    // Check if user already has an active key (one key per parent)
    const user = await User.findById(req.user._id).populate('subscriptionKey');
    if (user.subscriptionKey) {
      const existingKey = user.subscriptionKey;
      if (existingKey.status === 'active') {
        return res.status(409).json({ error: 'You already have an active subscription.' });
      }
      // Unlink old expired key so user can activate a new one
      // Clear the activatedBy on the old key so the unique index frees up
      await SubscriptionKey.findByIdAndUpdate(existingKey._id, { activatedBy: null });
    }

    // Activate the key
    const now = new Date();
    const expiresAt = SubscriptionKey.addMonths(now, subKey.durationMonths);

    subKey.status = 'active';
    subKey.activatedBy = req.user._id;
    subKey.activatedAt = now;
    subKey.expiresAt = expiresAt;
    await subKey.save();

    // Link to user
    user.subscriptionKey = subKey._id;
    await user.save();

    res.json({
      message: 'Subscription activated successfully',
      subscription: {
        key: subKey.key,
        maxKids: subKey.maxKids,
        expiresAt,
        activatedAt: now,
        durationMonths: subKey.durationMonths,
        status: 'active',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
