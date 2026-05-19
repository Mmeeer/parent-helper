const { isReviewEmail } = require('../utils/reviewAccess');

const emailVerified = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  // App-store review account: email verification is the #1 rejection risk, so
  // never block the reviewer on it (inert unless REVIEW_ACCOUNT_EMAIL is set;
  // the seeded account is emailVerified=true anyway — this is belt-and-braces).
  if (isReviewEmail(req.user && req.user.email)) return next();
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
