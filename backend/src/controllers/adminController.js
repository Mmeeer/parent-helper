const User = require('../models/User');
const Child = require('../models/Child');
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const ActivityLog = require('../models/ActivityLog');
const ContentFilter = require('../models/ContentFilter');

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
      planDistribution,
      recentRegistrations,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ updatedAt: { $gte: thirtyDaysAgo } }),
      Child.countDocuments(),
      Device.countDocuments({ paired: true }),
      User.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } },
      ]),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    const planDist = {};
    planDistribution.forEach((p) => {
      planDist[p._id] = p.count;
    });

    res.json({
      totalUsers,
      activeUsers,
      totalChildren,
      totalDevices,
      planDistribution: planDist,
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

// PUT /admin/users/:id/plan — Update user subscription plan
exports.updateUserPlan = async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!['free', 'premium', 'family'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be free, premium, or family.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.plan = plan;
    await user.save();

    res.json({
      message: `Plan updated to ${plan}`,
      user: { id: user._id, email: user.email, name: user.name, plan: user.plan },
    });
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
