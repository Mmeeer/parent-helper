const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- 1. Per-socket rate limiter ---

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_EVENTS_PER_WINDOW = 60;

/**
 * Track and enforce per-socket event rate limits.
 * Returns true if the event should be allowed, false if rate-limited.
 */
function checkRateLimit(socket) {
  const now = Date.now();
  if (!socket._rl) {
    socket._rl = { count: 1, windowStart: now };
    return true;
  }
  if (now - socket._rl.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Reset window
    socket._rl.count = 1;
    socket._rl.windowStart = now;
    return true;
  }
  socket._rl.count++;
  return socket._rl.count <= MAX_EVENTS_PER_WINDOW;
}

/**
 * Socket.io middleware that wraps incoming event handlers with rate limiting.
 * Attach after connection: applyRateLimit(socket)
 */
function applyRateLimit(socket) {
  const originalOnEvent = socket.onevent;
  socket.onevent = function (packet) {
    if (!checkRateLimit(socket)) {
      const eventName = packet.data && packet.data[0];
      console.log(`[SOCKET] Rate limited ${socket.id} — event: ${eventName}`);
      socket.emit('error', { message: 'Rate limit exceeded. Max 60 events/min.' });
      return;
    }
    originalOnEvent.call(socket, packet);
  };
}

// --- 2. Periodic JWT re-validation ---

const REAUTH_INTERVAL_MS = 5 * 60_000; // 5 minutes

/**
 * Start a periodic check that verifies the parent's JWT is still valid.
 * If the token is expired or the user is suspended/deleted, force disconnect.
 * Call clearInterval(socket._reauthTimer) on disconnect to clean up.
 */
function startReauthTimer(socket) {
  socket._reauthTimer = setInterval(async () => {
    // Only applies to parent sockets that have authenticated
    if (!socket._parentToken || !socket._parentUserId) return;

    try {
      // Verify token is still valid (checks expiry)
      jwt.verify(socket._parentToken, process.env.JWT_SECRET);
    } catch (err) {
      console.log(`[SOCKET] JWT expired for parent ${socket._parentUserId} (${socket.id}), forcing reconnect`);
      socket.emit('auth:expired', { message: 'Token expired. Please re-authenticate.' });
      socket.disconnect(true);
      return;
    }

    // Check user status (suspended/deleted)
    try {
      const rejected = await isUserRejected(socket._parentUserId);
      if (rejected) {
        console.log(`[SOCKET] User ${socket._parentUserId} suspended/deleted, disconnecting ${socket.id}`);
        socket.emit('auth:revoked', { message: 'Account suspended or deleted.' });
        socket.disconnect(true);
      }
    } catch (err) {
      console.error(`[SOCKET] Re-auth user check error for ${socket.id}:`, err.message);
    }
  }, REAUTH_INTERVAL_MS);
}

// --- 3. Reject suspended/deleted users ---

/**
 * Returns true if the user should be rejected (locked or deletion requested).
 */
async function isUserRejected(userId) {
  const user = await User.findById(userId)
    .select('lockUntil deletionRequestedAt')
    .lean();
  if (!user) return true; // user deleted from DB
  if (user.deletionRequestedAt) return true;
  if (user.lockUntil && user.lockUntil > new Date()) return true;
  return false;
}

module.exports = { applyRateLimit, startReauthTimer, isUserRejected };
