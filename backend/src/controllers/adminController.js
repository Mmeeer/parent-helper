const User = require('../models/User');
const Child = require('../models/Child');
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const ActivityLog = require('../models/ActivityLog');
const ContentFilter = require('../models/ContentFilter');
const SubscriptionKey = require('../models/SubscriptionKey');

// POST /admin/seed — Create initial admin account (only if no admin exists)
exports.seed = async (req, res, next) => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(409).json({ error: 'Admin account already exists' });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@parenthelper.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

    const admin = new User({
      email: adminEmail,
      passwordHash: adminPassword,
      name: 'Admin',
      role: 'admin',
    });
    await admin.save();

    res.status(201).json({
      message: 'Admin account created',
      email: adminEmail,
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/users — List all users with pagination & search
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const query = search
      ? {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -refreshToken')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Enrich with children count
    const userIds = users.map((u) => u._id);
    const childrenCounts = await Child.aggregate([
      { $match: { parentId: { $in: userIds } } },
      { $group: { _id: '$parentId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    childrenCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const enrichedUsers = users.map((u) => ({
      ...u,
      childrenCount: countMap[u._id.toString()] || 0,
    }));

    res.json({
      users: enrichedUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/users/:id — Get user detail with children & devices
exports.getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -refreshToken')
      .lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [children, devices] = await Promise.all([
      Child.find({ parentId: user._id }).lean(),
      Device.find({ parentId: user._id }).lean(),
    ]);

    res.json({ ...user, children, devices });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/users/:id/suspend — Suspend a user account
exports.suspendUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate refresh token to force logout
    user.refreshToken = null;
    await user.save();

    res.json({ message: 'User suspended successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /admin/analytics — Platform analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalChildren,
      totalDevices,
      subscribedUsers,
      totalKeys,
      activeKeys,
      recentRegistrations,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ updatedAt: { $gte: thirtyDaysAgo } }),
      Child.countDocuments(),
      Device.countDocuments({ paired: true }),
      User.countDocuments({ subscriptionKey: { $ne: null } }),
      SubscriptionKey.countDocuments(),
      SubscriptionKey.countDocuments({ status: 'active' }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalChildren,
      totalDevices,
      subscriptions: { subscribed: subscribedUsers, totalKeys, activeKeys },
      recentRegistrations,
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/filters — Get content filter database
exports.getFilters = async (req, res, next) => {
  try {
    const categories = [
      'adult', 'gambling', 'violence', 'drugs', 'weapons',
      'hate', 'malware', 'phishing', 'social_media', 'gaming', 'streaming',
    ];

    const domains = await ContentFilter.find().sort({ category: 1, domain: 1 }).lean();

    res.json({ categories, domains });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/filters — Add/update a domain filter
exports.updateFilter = async (req, res, next) => {
  try {
    const { domain, category } = req.body;
    if (!domain || !category) {
      return res.status(400).json({ error: 'Domain and category are required' });
    }

    const filter = await ContentFilter.findOneAndUpdate(
      { domain: domain.toLowerCase().trim() },
      { category },
      { upsert: true, new: true },
    );

    res.json({ message: 'Filter updated', filter });
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/filters/:domain — Remove a domain filter
exports.deleteFilter = async (req, res, next) => {
  try {
    const { domain } = req.params;

    const result = await ContentFilter.findOneAndDelete({ domain: decodeURIComponent(domain).toLowerCase() });
    if (!result) {
      return res.status(404).json({ error: 'Domain not found in filters' });
    }

    res.json({ message: 'Filter removed', domain });
  } catch (err) {
    next(err);
  }
};

// POST /admin/keys — Create subscription key
exports.createKey = async (req, res, next) => {
  try {
    const { maxKids, durationMonths, note } = req.body;
    if (!maxKids || !durationMonths) {
      return res.status(400).json({ error: 'maxKids and durationMonths are required' });
    }
    if (durationMonths < 1 || durationMonths > 12) {
      return res.status(400).json({ error: 'durationMonths must be between 1 and 12' });
    }

    const key = SubscriptionKey.generateKey();
    const subKey = await SubscriptionKey.create({
      key,
      maxKids,
      durationMonths,
      note: note || '',
      createdBy: req.user._id,
    });

    res.status(201).json(subKey);
  } catch (err) {
    next(err);
  }
};

// GET /admin/keys — List all subscription keys
exports.getKeys = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = status ? { status } : {};
    const [keys, total] = await Promise.all([
      SubscriptionKey.find(query)
        .populate('activatedBy', 'name email')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SubscriptionKey.countDocuments(query),
    ]);

    // Check and mark expired keys
    const now = new Date();
    for (const k of keys) {
      if (k.status === 'active' && k.expiresAt && new Date(k.expiresAt) < now) {
        await SubscriptionKey.findByIdAndUpdate(k._id, { status: 'expired' });
        k.status = 'expired';
      }
    }

    res.json({ keys, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/keys/:id — Update key (maxKids, note)
exports.updateKey = async (req, res, next) => {
  try {
    const { maxKids, note } = req.body;
    const update = {};
    if (maxKids !== undefined) update.maxKids = maxKids;
    if (note !== undefined) update.note = note;

    const key = await SubscriptionKey.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!key) return res.status(404).json({ error: 'Key not found' });

    res.json(key);
  } catch (err) {
    next(err);
  }
};

// PUT /admin/keys/:id/extend — Extend key expiration
exports.extendKey = async (req, res, next) => {
  try {
    const { months } = req.body;
    if (!months || months < 1 || months > 12) {
      return res.status(400).json({ error: 'months must be between 1 and 12' });
    }

    const key = await SubscriptionKey.findById(req.params.id);
    if (!key) return res.status(404).json({ error: 'Key not found' });
    if (key.status === 'unused') {
      return res.status(400).json({ error: 'Cannot extend an unused key. Change durationMonths instead.' });
    }

    // Extend from current expiry (or from now if already expired)
    const baseDate = key.expiresAt && new Date(key.expiresAt) > new Date() ? key.expiresAt : new Date();
    key.expiresAt = SubscriptionKey.addMonths(baseDate, months);
    key.status = 'active';
    await key.save();

    res.json({ message: `Extended by ${months} month(s)`, key });
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/keys/:id — Delete unused key
exports.deleteKey = async (req, res, next) => {
  try {
    const key = await SubscriptionKey.findById(req.params.id);
    if (!key) return res.status(404).json({ error: 'Key not found' });
    if (key.status === 'active') {
      return res.status(400).json({ error: 'Cannot delete an active key. It must expire first.' });
    }

    await SubscriptionKey.findByIdAndDelete(req.params.id);
    res.json({ message: 'Key deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /admin/health — System health overview
exports.getSystemHealth = async (req, res, next) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      onlineDevices,
      offlineDevices,
      totalDevices,
      alertsToday,
      alertsByType,
      activityLogsToday,
      recentUsers,
    ] = await Promise.all([
      Device.countDocuments({ paired: true, status: 'online' }),
      Device.countDocuments({ paired: true, status: 'offline' }),
      Device.countDocuments({ paired: true }),
      Alert.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Alert.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ActivityLog.countDocuments({ updatedAt: { $gte: oneDayAgo } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    const alertsByTypeMap = {};
    alertsByType.forEach((a) => {
      alertsByTypeMap[a._id] = a.count;
    });

    res.json({
      devices: {
        total: totalDevices,
        online: onlineDevices,
        offline: offlineDevices,
      },
      alerts: {
        today: alertsToday,
        byType: alertsByTypeMap,
      },
      activity: {
        logsToday: activityLogsToday,
      },
      users: {
        newThisWeek: recentUsers,
      },
      serverTime: now.toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    next(err);
  }
};
