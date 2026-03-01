require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const devicesRoutes = require('./routes/devices');
const rulesRoutes = require('./routes/rules');
const activityRoutes = require('./routes/activity');
const alertsRoutes = require('./routes/alerts');
const approvalsRoutes = require('./routes/approvals');
const geofenceRoutes = require('./routes/geofences');
const adminRoutes = require('./routes/admin');

const { startOfflineDetector } = require('./jobs/offlineDetector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/auth', authRoutes);
app.use('/children', childrenRoutes);
app.use('/devices', devicesRoutes);
app.use('/rules', rulesRoutes);
app.use('/activity', activityRoutes);
app.use('/alerts', alertsRoutes);
app.use('/approvals', approvalsRoutes);
app.use('/geofences', geofenceRoutes);
app.use('/admin', adminRoutes);

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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// WebSocket
const jwt = require('jsonwebtoken');
const Device = require('./models/Device');

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Parent joins with JWT token
  socket.on('join:parent', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.join(`parent:${decoded.id}`);
    } catch {
      socket.emit('error', { message: 'Invalid token' });
    }
  });

  // Device joins with device token
  socket.on('join:device', async (deviceToken) => {
    try {
      const device = await Device.findOne({ deviceToken, paired: true });
      if (device) {
        socket.join(`device:${device._id}`);
      } else {
        socket.emit('error', { message: 'Invalid device token' });
      }
    } catch {
      socket.emit('error', { message: 'Authentication failed' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  startOfflineDetector(io);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
