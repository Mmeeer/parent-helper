const SubscriptionKey = require('../models/SubscriptionKey');
const User = require('../models/User');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // every hour
const WARNING_DAYS = 3; // warn when ≤ 3 days remain

function startSubscriptionChecker(io) {
  const intervalId = setInterval(async () => {
    try {
      const now = new Date();

      // 1. Mark expired subscriptions that are still flagged as active
      const expired = await SubscriptionKey.find({
        status: 'active',
        expiresAt: { $lt: now },
      });

      for (const sub of expired) {
        sub.status = 'expired';
        await sub.save();
        console.log(`[SubscriptionChecker] Marked key ${sub.key} as expired`);

        if (sub.activatedBy) {
          io.to(`parent:${sub.activatedBy}`).emit('subscription:expired', {
            message: 'Your subscription has expired. Renew to regain full access.',
            expiredAt: sub.expiresAt,
          });
        }
      }

      // 2. Warn parents whose subscription expires within WARNING_DAYS
      const warningCutoff = new Date(now.getTime() + WARNING_DAYS * 24 * 60 * 60 * 1000);
      const expiringSoon = await SubscriptionKey.find({
        status: 'active',
        expiresAt: { $gt: now, $lte: warningCutoff },
        activatedBy: { $ne: null },
      });

      for (const sub of expiringSoon) {
        const daysLeft = Math.ceil((new Date(sub.expiresAt) - now) / (24 * 60 * 60 * 1000));
        io.to(`parent:${sub.activatedBy}`).emit('subscription:expiring', {
          message: `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew soon to avoid losing access.`,
          expiresAt: sub.expiresAt,
          daysLeft,
        });
      }

      if (expired.length > 0 || expiringSoon.length > 0) {
        console.log(`[SubscriptionChecker] Expired: ${expired.length}, Expiring soon: ${expiringSoon.length}`);
      }
    } catch (err) {
      console.error('[SubscriptionChecker] Error:', err.message);
    }
  }, CHECK_INTERVAL_MS);

  return intervalId;
}

module.exports = { startSubscriptionChecker };
