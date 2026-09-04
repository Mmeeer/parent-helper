const mongoose = require('mongoose');

/**
 * One-time index migrations, self-applied on boot so deploys never depend on
 * manual mongo-shell steps (the email_1 deploy note was never run in production,
 * which made blank-email registrations collide on the old non-sparse index).
 * Every step is idempotent and failure-tolerant: a migration error is logged
 * but never blocks startup.
 */
const ensureIndexMigrations = async () => {
  const db = mongoose.connection.db;

  // users: legacy null values would be indexed even by sparse indexes.
  try {
    await db.collection('users').updateMany({ email: null }, { $unset: { email: '' } });
    await db.collection('users').updateMany({ phone: null }, { $unset: { phone: '' } });
  } catch (err) {
    console.error(`[migrate] users null-unset: ${err.message}`);
  }
  // Drop the legacy non-sparse unique indexes; Mongoose recreates them sparse.
  for (const name of ['email_1', 'phone_1']) {
    try {
      const idx = (await db.collection('users').indexes()).find((i) => i.name === name);
      if (idx && !idx.sparse) {
        await db.collection('users').dropIndex(name);
        console.log(`[migrate] dropped non-sparse users.${name}`);
      }
    } catch (err) {
      console.error(`[migrate] users.${name}: ${err.message}`);
    }
  }
  // phoneotps: TTL grace changed 0 → 86400 (clock-skew protection). An index's
  // expireAfterSeconds can't be altered by ensureIndexes; drop so it's rebuilt.
  try {
    const idx = (await db.collection('phoneotps').indexes()).find((i) => i.name === 'expiresAt_1');
    if (idx && idx.expireAfterSeconds !== 86400) {
      await db.collection('phoneotps').dropIndex('expiresAt_1');
      console.log('[migrate] dropped phoneotps.expiresAt_1 (TTL grace rebuild)');
    }
  } catch (err) {
    console.error(`[migrate] phoneotps.expiresAt_1: ${err.message}`);
  }
  // Rebuild whatever the schemas declare.
  try {
    await mongoose.model('User').ensureIndexes();
    await mongoose.model('PhoneOtp').ensureIndexes();
  } catch (err) {
    console.error(`[migrate] ensureIndexes: ${err.message}`);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    // Models must be registered before ensureIndexes can see them.
    require('../models/User');
    require('../models/PhoneOtp');
    await ensureIndexMigrations();
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
