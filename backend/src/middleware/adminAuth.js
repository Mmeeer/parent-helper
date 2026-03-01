const auth = require('./auth');

const adminAuth = (req, res, next) => {
  // First run normal auth
  auth(req, res, (err) => {
    if (err) return next(err);
    // If auth middleware sent a response (status 401), don't continue
    if (res.headersSent) return;
    // Check admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

module.exports = adminAuth;
