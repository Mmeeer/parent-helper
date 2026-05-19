const User = require('../models/User');
const SubscriptionKey = require('../models/SubscriptionKey');
const { isReviewEmail } = require('../utils/reviewAccess');

/**
 * Middleware that blocks write operations when the parent's subscription is
 * missing or expired.  Attach it to routes that modify rules, send device
 * commands, create geofences, etc.
 *
 * Read-only endpoints (GET) are intentionally left open so parents can still
 * view their children's data after expiry (graceful degradation).
 */
const requireSubscription = async (req, res, next) => {
  try {
    // App-store review account: never gate the reviewer's parent app on
    // subscription state (inert unless REVIEW_ACCOUNT_EMAIL is set).
    if (isReviewEmail(req.user && req.user.email)) return next();

    const user = await User.findById(req.user._id).populate('subscriptionKey');
    const sub = user && user.subscriptionKey;

    if (!sub || sub.status !== 'active') {
      return res.status(403).json({
        error: 'Active subscription required. Please activate a subscription key.',
        code: 'SUBSCRIPTION_INACTIVE',
      });
    }

    // Check if the key has silently expired since the last status update
    if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
      await SubscriptionKey.findByIdAndUpdate(sub._id, { status: 'expired' });
      return res.status(403).json({
        error: 'Your subscription has expired. Please activate a new key to continue.',
        code: 'SUBSCRIPTION_EXPIRED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireSubscription;
