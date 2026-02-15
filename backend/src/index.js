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
const adminRoutes = require('./routes/admin');

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
app.use('/admin', adminRoutes);

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
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
