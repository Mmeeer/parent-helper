/**
 * Idempotent seeder for the Google Play / App Store review account.
 *
 * Run:  cd /root/projects/parent-helper/backend && node scripts/seed-review-account.js
 *
 * Creates / refreshes (safe to run repeatedly):
 *   • review@parenthelper.com  — password ReviewTest2026!, emailVerified=true,
 *     account unlocked, no pending deletion.
 *   • An ACTIVE 12-month SubscriptionKey (maxKids 5) linked to that user, with
 *     its expiry pushed 12 months out on every run so it never lapses mid-review.
 *   • Two demo children + default Rules, two already-paired demo Devices (an
 *     Android phone on the first child, an iPhone on the second so the parent
 *     app's iOS-gated UI is visible to reviewers), and demo Geofences /
 *     ActivityLogs / Alerts so the parent dashboard looks like a real,
 *     populated account the moment the reviewer logs in.
 *
 * The reusable demo pairing code itself is NOT seeded as a Device — it is
 * matched from env (REVIEW_DEMO_PAIRING_CODE) in devicesController so it is
 * never consumed. This script only needs to guarantee the demo child exists.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
const mongoose = require('mongoose');

const User = require('../src/models/User');
const SubscriptionKey = require('../src/models/SubscriptionKey');
const Child = require('../src/models/Child');
const Device = require('../src/models/Device');
const Rule = require('../src/models/Rule');
const Geofence = require('../src/models/Geofence');
const ActivityLog = require('../src/models/ActivityLog');
const Alert = require('../src/models/Alert');

const REVIEW_EMAIL = (process.env.REVIEW_ACCOUNT_EMAIL || 'review@parenthelper.com').toLowerCase();
const REVIEW_PASSWORD = 'ReviewTest2026!';
const SUB_KEY = 'PK-REVIEW-2026';
const crypto = require('crypto');

const ymd = (d) => d.toISOString().slice(0, 10);

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set (check backend/.env)');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[seed] connected to', mongoose.connection.name);

  // ── 1. Review user ──────────────────────────────────────────────────────
  let user = await User.findOne({ email: REVIEW_EMAIL });
  if (!user) {
    user = new User({
      email: REVIEW_EMAIL,
      phone: '+97688112233',
      name: 'App Review',
      passwordHash: REVIEW_PASSWORD, // hashed by User pre-save hook
      tokenFamily: crypto.randomUUID(),
    });
  } else {
    user.passwordHash = REVIEW_PASSWORD; // marks modified → re-hashed by hook
  }
  user.emailVerified = true;
  user.emailVerificationCode = null;
  user.emailVerificationCodeExpiresAt = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.deletionRequestedAt = null;
  user.deletionReason = null;
  await user.save();
  console.log('[seed] user upserted:', user.email, String(user._id));

  // ── 2. Active subscription (refresh expiry every run) ───────────────────
  // Free any other key still pinned to this user (unique sparse activatedBy).
  await SubscriptionKey.updateMany(
    { activatedBy: user._id, key: { $ne: SUB_KEY } },
    { $set: { activatedBy: null, status: 'expired' } },
  );
  const now = new Date();
  const expiresAt = SubscriptionKey.addMonths(now, 12);
  let sub = await SubscriptionKey.findOne({ key: SUB_KEY });
  if (!sub) sub = new SubscriptionKey({ key: SUB_KEY, maxKids: 5, durationMonths: 12 });
  sub.maxKids = 5;
  sub.durationMonths = 12;
  sub.status = 'active';
  sub.activatedBy = user._id;
  sub.activatedAt = now;
  sub.expiresAt = expiresAt;
  sub.note = 'App-store review account — do not distribute';
  await sub.save();
  user.subscriptionKey = sub._id;
  await user.save();
  console.log('[seed] subscription active until', expiresAt.toISOString(), '(maxKids', sub.maxKids + ')');

  // ── 3. Demo children + default rules ────────────────────────────────────
  const demoKids = [
    { name: 'Saraa', age: 9 },
    { name: 'Bat', age: 13 },
  ];
  const kids = [];
  for (const k of demoKids) {
    let child = await Child.findOne({ parentId: user._id, name: k.name });
    if (!child) child = await Child.create({ ...k, parentId: user._id });
    else { child.age = k.age; await child.save(); }
    kids.push(child);

    await Rule.findOneAndUpdate(
      { childId: child._id },
      {
        $set: {
          'screenTime.dailyLimitMin': 120,
          blockedApps: ['com.example.casino', 'com.example.violentgame'],
          'webFilter.categories': ['adult', 'gambling', 'violence'],
        },
      },
      { upsert: true, setDefaultsOnInsert: true, new: true },
    );
  }
  const primary = kids[0];
  console.log('[seed] children:', kids.map((c) => `${c.name}(${c._id})`).join(', '));

  // ── 4. Paired demo device for the primary child ─────────────────────────
  let device = await Device.findOne({ childId: primary._id, parentId: user._id, paired: true });
  if (!device) {
    device = new Device({ childId: primary._id, parentId: user._id, paired: true });
  }
  device.paired = true;
  device.platform = 'android';
  device.model = 'Demo Pixel 6';
  device.osVersion = 'Android 14';
  device.appVersion = '1.0.0';
  device.status = 'online';
  device.lastSeen = new Date();
  if (!device.deviceToken) device.deviceToken = crypto.randomBytes(32).toString('hex');
  device.pairingCode = undefined;
  device.pairingExpiresAt = undefined;
  device.installedApps = [
    { packageName: 'com.google.android.youtube', appName: 'YouTube' },
    { packageName: 'com.android.chrome', appName: 'Chrome' },
    { packageName: 'com.roblox.client', appName: 'Roblox' },
    { packageName: 'com.duolingo', appName: 'Duolingo' },
  ];
  await device.save();
  console.log('[seed] paired demo device:', String(device._id));

  // ── 4b. Paired iOS demo device for the second child ─────────────────────
  // Lets reviewers see the iOS-gated parent UI (Screen Time selection, no
  // installed-apps picker, etc.). One paired device per kid, so this only
  // happens when a second demo child exists.
  const iosChild = kids[1] || null;
  let iosDevice = null;
  if (!iosChild) {
    console.log('[seed] only one demo child — skipping iOS demo device');
  } else {
    iosDevice = await Device.findOne({ childId: iosChild._id, parentId: user._id, paired: true });
    if (!iosDevice) {
      iosDevice = new Device({ childId: iosChild._id, parentId: user._id, paired: true });
    }
    iosDevice.paired = true;
    iosDevice.platform = 'ios';
    iosDevice.model = 'iPhone 15';
    iosDevice.osVersion = '17.5';
    iosDevice.appVersion = '1.0.0';
    iosDevice.status = 'online';
    iosDevice.lastSeen = new Date();
    if (!iosDevice.deviceToken) iosDevice.deviceToken = crypto.randomBytes(32).toString('hex');
    iosDevice.pairingCode = undefined;
    iosDevice.pairingExpiresAt = undefined;
    iosDevice.installedApps = []; // iOS cannot enumerate installed apps
    await iosDevice.save();

    // iOS-shaped rule fields so the parent app has something to render.
    await Rule.findOneAndUpdate(
      { childId: iosChild._id },
      {
        $set: {
          iosBlockSelected: true,
          'iosSelection.appCount': 3,
          'iosSelection.categoryCount': 1,
          'iosSelection.webDomainCount': 2,
          'iosSelection.updatedAt': new Date(),
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
    console.log('[seed] paired iOS demo device:', String(iosDevice._id), 'on', iosChild.name);
  }

  // ── 5. Demo dashboard data (rebuilt fresh each run) ─────────────────────
  await Promise.all([
    Geofence.deleteMany({ parentId: user._id }),
    ActivityLog.deleteMany({ childId: { $in: kids.map((k) => k._id) } }),
    Alert.deleteMany({ parentId: user._id }),
  ]);

  // Ulaanbaatar-ish coordinates
  const HOME = { lat: 47.9185, lng: 106.9176 };
  const SCHOOL = { lat: 47.9230, lng: 106.9050 };
  await Geofence.create([
    { childId: primary._id, parentId: user._id, name: 'Home', lat: HOME.lat, lng: HOME.lng, radiusMeters: 200 },
    { childId: primary._id, parentId: user._id, name: 'School', lat: SCHOOL.lat, lng: SCHOOL.lng, radiusMeters: 300 },
  ]);

  const logs = [];
  for (let d = 0; d < 5; d++) {
    const day = new Date(Date.now() - d * 86400000);
    logs.push({
      childId: primary._id,
      deviceId: device._id,
      date: ymd(day),
      apps: [
        { packageName: 'com.google.android.youtube', appName: 'YouTube', durationMin: 45 + d * 3 },
        { packageName: 'com.roblox.client', appName: 'Roblox', durationMin: 30 + d * 2 },
        { packageName: 'com.duolingo', appName: 'Duolingo', durationMin: 15 },
      ],
      web: [
        { url: 'https://en.wikipedia.org', timestamp: day, blocked: false },
        { url: 'https://some-adult-site.example', timestamp: day, blocked: true },
      ],
      location: [
        { lat: HOME.lat, lng: HOME.lng, timestamp: new Date(day.setHours(7, 30, 0, 0)) },
        { lat: SCHOOL.lat, lng: SCHOOL.lng, timestamp: new Date(day.setHours(9, 0, 0, 0)) },
      ],
      blockedAttempts: [
        { type: 'web', target: 'some-adult-site.example', timestamp: day },
        { type: 'app', target: 'com.example.casino', timestamp: day },
      ],
    });
  }
  if (iosDevice) {
    for (let d = 0; d < 3; d++) {
      const day = new Date(Date.now() - d * 86400000);
      logs.push({
        childId: iosChild._id,
        deviceId: iosDevice._id,
        date: ymd(day),
        apps: [], // iOS does not expose per-app usage
        web: [{ url: 'https://en.wikipedia.org', timestamp: day, blocked: false }],
        location: [{ lat: HOME.lat, lng: HOME.lng, timestamp: new Date(day.setHours(8, 0, 0, 0)) }],
        blockedAttempts: [{ type: 'shield', target: 'Selected apps', timestamp: day }],
        screenTime: { limitReachedAt: new Date(day.setHours(19, 30, 0, 0)), shieldEvents: 2 + d },
      });
    }
  }
  await ActivityLog.insertMany(logs);

  await Alert.create([
    {
      parentId: user._id, childId: primary._id, type: 'screen_time_limit',
      message: `${primary.name} reached the daily screen-time limit.`, read: false,
    },
    {
      parentId: user._id, childId: primary._id, type: 'geofence_trigger',
      message: `${primary.name} arrived at School.`, data: { geofence: 'School', event: 'entry' }, read: false,
    },
    {
      parentId: user._id, childId: primary._id, type: 'new_app_installed',
      message: `${primary.name} installed a new app: Roblox.`, read: true,
    },
    {
      parentId: user._id, childId: primary._id, type: 'blocked_content',
      message: `Blocked an adult website on ${primary.name}'s device.`, read: false,
    },
  ]);
  console.log('[seed] dashboard data: 2 geofences,', logs.length, 'activity logs, 4 alerts');

  await mongoose.disconnect();
  console.log('\n[seed] DONE. Login:', REVIEW_EMAIL, '/', REVIEW_PASSWORD,
    '\n[seed] Demo pairing code (child app):', process.env.REVIEW_DEMO_PAIRING_CODE || '(REVIEW_DEMO_PAIRING_CODE not set!)');
})().catch((e) => { console.error('[seed] ERROR', e); process.exit(1); });
