const User = require('../models/User');
const Child = require('../models/Child');
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const ActivityLog = require('../models/ActivityLog');
const ContentFilter = require('../models/ContentFilter');
const SubscriptionKey = require('../models/SubscriptionKey');
const Rule = require('../models/Rule');

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

// GET /admin/users — List all users with pagination, search, filters & sort
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const plan = req.query.plan; // free, subscribed
    const status = req.query.status; // active, suspended
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    if (plan === 'subscribed') query.subscriptionKey = { $ne: null };
    else if (plan === 'free') query.subscriptionKey = null;
    if (status === 'suspended') query.refreshToken = null;

    const allowedSorts = ['createdAt', 'name', 'email', 'updatedAt'];
    const sortField = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -refreshToken')
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Enrich with children count + device count
    const userIds = users.map((u) => u._id);
    const [childrenCounts, deviceCounts] = await Promise.all([
      Child.aggregate([
        { $match: { parentId: { $in: userIds } } },
        { $group: { _id: '$parentId', count: { $sum: 1 } } },
      ]),
      Device.aggregate([
        { $match: { parentId: { $in: userIds }, paired: true } },
        { $group: { _id: '$parentId', count: { $sum: 1 } } },
      ]),
    ]);
    const childMap = {};
    childrenCounts.forEach((c) => { childMap[c._id.toString()] = c.count; });
    const deviceMap = {};
    deviceCounts.forEach((d) => { deviceMap[d._id.toString()] = d.count; });

    const enrichedUsers = users.map((u) => ({
      ...u,
      childrenCount: childMap[u._id.toString()] || 0,
      deviceCount: deviceMap[u._id.toString()] || 0,
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

// PUT /admin/users/:id/unsuspend — Restore a suspended user
exports.unsuspendUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Just confirm account is accessible — refresh token will be set on next login
    res.json({ message: 'User unsuspended successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /admin/users/:id/rules — Rules for all children of a user
exports.getUserRules = async (req, res, next) => {
  try {
    const children = await Child.find({ parentId: req.params.id }).lean();
    const childIds = children.map((c) => c._id);
    const rules = await Rule.find({ childId: { $in: childIds } }).lean();

    // Map rules to children
    const result = children.map((child) => ({
      child,
      rules: rules.find((r) => r.childId.toString() === child._id.toString()) || null,
    }));
    res.json({ rules: result });
  } catch (err) {
    next(err);
  }
};

// GET /admin/users/:id/activity — Activity logs for user's children
exports.getUserActivity = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const children = await Child.find({ parentId: req.params.id }).lean();
    const childIds = children.map((c) => c._id);

    const logs = await ActivityLog.find({
      childId: { $in: childIds },
      updatedAt: { $gte: since },
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    res.json({ logs, children });
  } catch (err) {
    next(err);
  }
};

// GET /admin/users/:id/alerts — Paginated alerts for a user
exports.getUserAlerts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const [alerts, total] = await Promise.all([
      Alert.find({ parentId: req.params.id })
        .populate('childId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Alert.countDocuments({ parentId: req.params.id }),
    ]);

    res.json({ alerts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// GET /admin/dashboard — Combined dashboard data
exports.getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, activeUsers, totalChildren, totalDevices,
      onlineDevices, alertsToday, recentRegistrations,
      recentAlerts, alertsByType,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ updatedAt: { $gte: thirtyDaysAgo }, role: { $ne: 'admin' } }),
      Child.countDocuments(),
      Device.countDocuments({ paired: true }),
      Device.countDocuments({ paired: true, status: 'online' }),
      Alert.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo }, role: { $ne: 'admin' } }),
      Alert.find({ createdAt: { $gte: sevenDaysAgo } })
        .populate('parentId', 'name email')
        .populate('childId', 'name')
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      Alert.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Plan distribution
    const [subscribedUsers, totalKeys, activeKeys] = await Promise.all([
      User.countDocuments({ subscriptionKey: { $ne: null }, role: { $ne: 'admin' } }),
      SubscriptionKey.countDocuments(),
      SubscriptionKey.countDocuments({ status: 'active' }),
    ]);

    const alertsByTypeMap = {};
    alertsByType.forEach((a) => { alertsByTypeMap[a._id] = a.count; });

    res.json({
      stats: { totalUsers, activeUsers, totalChildren, totalDevices, onlineDevices, alertsToday, recentRegistrations },
      planDistribution: { free: totalUsers - subscribedUsers, subscribed: subscribedUsers, totalKeys, activeKeys },
      alertsByType: alertsByTypeMap,
      recentAlerts,
      serverTime: now.toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/activity/summary — Platform-wide activity aggregation
exports.getActivitySummary = async (req, res, next) => {
  try {
    const period = req.query.period || '7d';
    const days = parseInt(period) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [stats, topApps, topDomains, topBlocked] = await Promise.all([
      // Basic stats
      (async () => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [totalLogs, appHoursAgg, webVisitsAgg, blockedAgg] = await Promise.all([
          ActivityLog.countDocuments({ updatedAt: { $gte: oneDayAgo } }),
          ActivityLog.aggregate([
            { $match: { updatedAt: { $gte: oneDayAgo } } },
            { $unwind: '$apps' },
            { $group: { _id: null, totalMin: { $sum: '$apps.durationMin' } } },
          ]),
          ActivityLog.aggregate([
            { $match: { updatedAt: { $gte: oneDayAgo } } },
            { $project: { count: { $size: { $ifNull: ['$web', []] } } } },
            { $group: { _id: null, total: { $sum: '$count' } } },
          ]),
          ActivityLog.aggregate([
            { $match: { updatedAt: { $gte: oneDayAgo } } },
            { $project: { count: { $size: { $ifNull: ['$blockedAttempts', []] } } } },
            { $group: { _id: null, total: { $sum: '$count' } } },
          ]),
        ]);
        return {
          totalLogs,
          totalAppHours: Math.round(((appHoursAgg[0]?.totalMin || 0) / 60) * 10) / 10,
          totalWebVisits: webVisitsAgg[0]?.total || 0,
          totalBlocked: blockedAgg[0]?.total || 0,
        };
      })(),
      // Top apps
      ActivityLog.aggregate([
        { $match: { updatedAt: { $gte: since } } },
        { $unwind: '$apps' },
        { $group: { _id: { pkg: '$apps.packageName', name: '$apps.appName' }, totalMin: { $sum: '$apps.durationMin' }, children: { $addToSet: '$childId' } } },
        { $project: { _id: 0, packageName: '$_id.pkg', appName: '$_id.name', totalMinutes: '$totalMin', uniqueChildren: { $size: '$children' } } },
        { $sort: { totalMinutes: -1 } },
        { $limit: 20 },
      ]),
      // Top domains
      ActivityLog.aggregate([
        { $match: { updatedAt: { $gte: since } } },
        { $unwind: '$web' },
        { $addFields: { domain: { $arrayElemAt: [{ $split: [{ $arrayElemAt: [{ $split: ['$web.url', '//'] }, 1] }, '/'] }, 0] } } },
        { $group: { _id: '$domain', visits: { $sum: 1 }, blockedCount: { $sum: { $cond: ['$web.blocked', 1, 0] } } } },
        { $project: { _id: 0, domain: '$_id', visits: 1, blockedCount: 1 } },
        { $sort: { visits: -1 } },
        { $limit: 20 },
      ]),
      // Top blocked
      ActivityLog.aggregate([
        { $match: { updatedAt: { $gte: since } } },
        { $unwind: '$blockedAttempts' },
        { $group: { _id: { target: '$blockedAttempts.target', type: '$blockedAttempts.type' }, count: { $sum: 1 } } },
        { $project: { _id: 0, target: '$_id.target', type: '$_id.type', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    res.json({ stats, topApps, topDomains, topBlocked });
  } catch (err) {
    next(err);
  }
};

// GET /admin/alerts — Paginated platform-wide alert list
exports.getAlerts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type;
    const read = req.query.read;
    const period = req.query.period || '30d';
    const days = parseInt(period) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const query = { createdAt: { $gte: since } };
    if (type) query.type = type;
    if (read === 'true') query.read = true;
    else if (read === 'false') query.read = false;

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .populate('parentId', 'name email')
        .populate('childId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Alert.countDocuments(query),
    ]);

    res.json({ alerts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// GET /admin/alerts/summary — Alert statistics and trends
exports.getAlertsSummary = async (req, res, next) => {
  try {
    const period = req.query.period || '14d';
    const days = parseInt(period) || 14;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalToday, totalUnread, byType, trend, topUsers] = await Promise.all([
      Alert.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Alert.countDocuments({ read: false }),
      Alert.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Alert.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Alert.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$parentId', alertCount: { $sum: 1 } } },
        { $sort: { alertCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { _id: 0, parentId: '$_id', name: '$user.name', email: '$user.email', alertCount: 1 } },
      ]),
    ]);

    const byTypeMap = {};
    byType.forEach((a) => { byTypeMap[a._id] = a.count; });
    const trendData = trend.map((t) => ({ date: t._id, count: t.count }));

    res.json({ totalToday, totalUnread, byType: byTypeMap, trend: trendData, topUsers });
  } catch (err) {
    next(err);
  }
};

// GET /admin/health — System health overview
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
