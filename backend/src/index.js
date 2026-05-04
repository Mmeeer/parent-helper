require('dotenv').config({ override: true });
const Sentry = require('@sentry/node');
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize Sentry early, before Express app is created
if (process.env.SENTRY_DSN) {
  const { execSync } = require('child_process');
  const { version } = require('../package.json');
  let release;
  try { release = `parent-helper-api@${execSync('git rev-parse --short HEAD').toString().trim()}`; } catch { release = `parent-helper-api@${version}`; }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
    ignoreErrors: [
      'NetworkError',
      'ECONNRESET',
      'ECONNABORTED',
      'ETIMEDOUT',
      'jwt expired',
      'invalid token',
    ],
  });
  console.log(`[Sentry] Initialized — release: ${release}`);
}

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const authRoutes = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const devicesRoutes = require('./routes/devices');
const rulesRoutes = require('./routes/rules');
const activityRoutes = require('./routes/activity');
const alertsRoutes = require('./routes/alerts');
const approvalsRoutes = require('./routes/approvals');
const geofenceRoutes = require('./routes/geofences');
const geocodeRoutes = require('./routes/geocode');
const adminRoutes = require('./routes/admin');
const subscriptionRoutes = require('./routes/subscription');

const { startOfflineDetector } = require('./jobs/offlineDetector');
const { initFirebase } = require('./services/pushNotification');
const { initEmail } = require('./services/email');

// Validate critical secrets on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
  console.error('[SECURITY] JWT_SECRET is not set or is using the default value. Set a strong secret in .env');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === process.env.JWT_SECRET) {
  console.error('[SECURITY] JWT_REFRESH_SECRET should be set and different from JWT_SECRET');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

// Security headers
app.use(helmet());

// CORS — restrict to allowed origins
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json({ limit: '10mb' }));

// Serve legal/public pages without auth (privacy policy, terms, COPPA)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Global rate limit
app.use(apiLimiter);

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

// Make io accessible to routes
app.set('io', io);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Parent Helper API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Routes
app.use('/auth', authRoutes);
app.use('/children', childrenRoutes);
app.use('/devices', devicesRoutes);
app.use('/rules', rulesRoutes);
app.use('/activity', activityRoutes);
app.use('/alerts', alertsRoutes);
app.use('/approvals', approvalsRoutes);
app.use('/geofences', geofenceRoutes);
app.use('/geocode', geocodeRoutes);
app.use('/admin', adminRoutes);
app.use('/subscription', subscriptionRoutes);

// Content filters endpoint for child devices
const deviceAuth = require('./middleware/deviceAuth');
const ContentFilter = require('./models/ContentFilter');
app.get('/filters', deviceAuth, async (req, res, next) => {
  try {
    const categories = req.query.categories;
    const filter = categories ? { category: { $in: [].concat(categories) } } : {};
    const domains = await ContentFilter.find(filter).select('domain category').lean();
    res.json(domains);
  } catch (err) {
    next(err);
  }
});

const mongoose = require('mongoose');

// Health check — liveness + readiness (checks DB)
app.get('/health', async (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const status = dbReady ? 'ok' : 'unhealthy';
  const code = dbReady ? 200 : 503;

  res.status(code).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    db: dbReady ? 'connected' : 'disconnected',
  });
});


// Sentry error handler — must be before custom errorHandler
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

// WebSocket
const jwt = require('jsonwebtoken');
const Device = require('./models/Device');
const { applyRateLimit, startReauthTimer, isUserRejected } = require('./middleware/socketGuard');

io.on('connection', (socket) => {
  const transport = socket.conn.transport.name;
  const origin = socket.handshake.headers.origin || socket.handshake.headers.referer || 'unknown';
  console.log(`[SOCKET] Client connected: ${socket.id} (transport: ${transport}, origin: ${origin})`);

  // Apply per-socket rate limiting (max 60 events/min)
  applyRateLimit(socket);

  // Start periodic JWT re-validation (every 5 min)
  startReauthTimer(socket);

  // Parent joins with JWT token
  socket.on('join:parent', async (token) => {
    console.log(`[SOCKET] join:parent requested by ${socket.id}`);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Reject suspended/deleted users
      const rejected = await isUserRejected(decoded.id);
      if (rejected) {
        console.log(`[SOCKET] join:parent rejected — user ${decoded.id} suspended/deleted`);
        socket.emit('auth:revoked', { message: 'Account suspended or deleted.' });
        socket.disconnect(true);
        return;
      }

      // Store token & userId for periodic re-auth checks
      socket._parentToken = token;
      socket._parentUserId = decoded.id;

      socket.join(`parent:${decoded.id}`);
      console.log(`[SOCKET] Parent joined room: parent:${decoded.id}`);
    } catch (err) {
      console.log(`[SOCKET] join:parent failed for ${socket.id}:`, err.message);
      socket.emit('error', { message: 'Invalid token' });
    }
  });

  // Device joins with device token
  socket.on('join:device', async (deviceToken) => {
    console.log(`[SOCKET] join:device requested by ${socket.id}, token: ${deviceToken ? deviceToken.substring(0, 8) + '...' : 'EMPTY'}`);
    try {
      const device = await Device.findOne({ deviceToken, paired: true });
      if (device) {
        socket.join(`device:${device._id}`);
        console.log(`[SOCKET] Device joined room: device:${device._id}`);
      } else {
        console.log(`[SOCKET] join:device failed: no paired device found for token`);
        socket.emit('error', { message: 'Invalid device token' });
      }
    } catch (err) {
      console.log(`[SOCKET] join:device error for ${socket.id}:`, err.message);
      socket.emit('error', { message: 'Authentication failed' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[SOCKET] Client disconnected: ${socket.id} (reason: ${reason})`);
    // Clean up re-auth timer
    if (socket._reauthTimer) clearInterval(socket._reauthTimer);
    // Clean up room memberships to prevent stale references
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    for (const room of rooms) {
      socket.leave(room);
    }
  });
});

const PORT = process.env.PORT || 3000;

let offlineDetectorId = null;

const start = async () => {
  await connectDB();

  // One-time migration: paired devices may have `pairingCode: null` from a
  // legacy bug where the controller set the field to null instead of $unset.
  // Sparse unique indexes treat null as a real value, so two such docs would
  // collide on the next pairing attempt. Strip the field everywhere it's null.
  const pairingCleanup = await Device.updateMany(
    { paired: true, $or: [{ pairingCode: null }, { pairingExpiresAt: null }] },
    { $unset: { pairingCode: '', pairingExpiresAt: '' } },
  );
  if (pairingCleanup.modifiedCount > 0) {
    console.log(`[Startup] Cleaned up ${pairingCleanup.modifiedCount} paired device(s) with null pairingCode`);
  }

  initFirebase();
  initEmail();
  offlineDetectorId = startOfflineDetector(io);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n[Shutdown] ${signal} received. Shutting down gracefully...`);

  // Stop accepting new connections
  server.close(() => {
    console.log('[Shutdown] HTTP server closed');
  });

  // Stop background jobs
  if (offlineDetectorId) clearInterval(offlineDetectorId);

  // Close Socket.io connections
  io.close(() => {
    console.log('[Shutdown] Socket.io closed');
  });

  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log('[Shutdown] MongoDB connection closed');
  } catch (err) {
    console.error('[Shutdown] MongoDB close error:', err.message);
  }

  // Flush Sentry events before exit
  if (process.env.SENTRY_DSN) {
    await Sentry.close(2000);
    console.log('[Shutdown] Sentry flushed');
  }

  // Allow 5 seconds for in-flight requests, then force exit
  setTimeout(() => {
    console.log('[Shutdown] Forcing exit after timeout');
    process.exit(1);
  }, 5000).unref();

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
