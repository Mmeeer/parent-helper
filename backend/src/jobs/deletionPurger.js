const User = require('../models/User');
const Child = require('../models/Child');
const Rule = require('../models/Rule');
const ActivityLog = require('../models/ActivityLog');
const Alert = require('../models/Alert');
const Geofence = require('../models/Geofence');
const Device = require('../models/Device');
const SubscriptionKey = require('../models/SubscriptionKey');

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Permanently deletes accounts whose in-app deletion request is older than the
 * 30-day grace period (Apple 5.1.1(v): deletion must complete without contacting
 * support). Same logic as the manual admin endpoint POST /admin/deletions/purge.
 */
async function purgeExpiredDeletions() {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_MS);
  const users = await User.find({ deletionRequestedAt: { $ne: null, $lte: cutoff } });
  let purged = 0;
  for (const user of users) {
    const children = await Child.find({ parentId: user._id });
    const childIds = children.map((c) => c._id);
    await Promise.all([
      Rule.deleteMany({ childId: { $in: childIds } }),
      ActivityLog.deleteMany({ childId: { $in: childIds } }),
      Alert.deleteMany({ parentId: user._id }),
      Geofence.deleteMany({ parentId: user._id }),
      Device.deleteMany({ parentId: user._id }),
      Child.deleteMany({ parentId: user._id }),
    ]);
    if (user.subscriptionKey) {
      await SubscriptionKey.findByIdAndUpdate(user.subscriptionKey, { activatedBy: null, status: 'expired' });
    }
    await User.findByIdAndDelete(user._id);
    console.log(`[DeletionPurger] Permanently deleted user ${user.email} (requested ${user.deletionRequestedAt.toISOString()})`);
    purged++;
  }
  return purged;
}

function startDeletionPurger() {
  // Run once shortly after boot, then on the interval.
  setTimeout(() => purgeExpiredDeletions().catch((e) => console.error('[DeletionPurger]', e.message)), 60 * 1000);
  return setInterval(() => {
    purgeExpiredDeletions().catch((e) => console.error('[DeletionPurger]', e.message));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startDeletionPurger, purgeExpiredDeletions };
