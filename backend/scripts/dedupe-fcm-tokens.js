/**
 * One-time cleanup: an FCM token identifies an app INSTALL, so it must belong to at
 * most one account. Registrations since the exclusivity fix enforce that, but tokens
 * attached to multiple users BEFORE the fix keep delivering other families' alerts
 * until each phone happens to re-register. This script removes the stale claims:
 * for every token held by 2+ users, the most recently updated claim wins.
 *
 * Run on the server:  node scripts/dedupe-fcm-tokens.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const users = await User.find({ 'fcmTokens.0': { $exists: true } }).select('email phone fcmTokens');

  const claims = new Map(); // token -> [{ userId, updatedAt }]
  for (const u of users) {
    for (const t of u.fcmTokens) {
      if (!claims.has(t.token)) claims.set(t.token, []);
      claims.get(t.token).push({ userId: u._id, who: u.email || u.phone, updatedAt: t.updatedAt || new Date(0) });
    }
  }

  let cleaned = 0;
  for (const [token, holders] of claims) {
    if (holders.length < 2) continue;
    holders.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const keeper = holders[0];
    for (const stale of holders.slice(1)) {
      await User.updateOne({ _id: stale.userId }, { $pull: { fcmTokens: { token } } });
      console.log(`token …${token.slice(-10)}: kept ${keeper.who}, removed from ${stale.who}`);
      cleaned++;
    }
  }
  console.log(cleaned === 0 ? 'No duplicate tokens found — clean.' : `Removed ${cleaned} stale claim(s).`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
