const emailVerified = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Email not verified',
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email address before using this feature.',
    });
  }
  next();
};

module.exports = emailVerified;
