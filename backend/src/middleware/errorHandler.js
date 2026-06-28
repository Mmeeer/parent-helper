const Sentry = require('@sentry/node');

const errorHandler = (err, req, res, _next) => {
  // Client-caused body-parser errors (malformed JSON, oversized payload) are NOT
  // server faults — internet scanners hit the API with junk constantly. Return the
  // correct 4xx, log a one-liner (no stack), and don't page Sentry with the noise.
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err)) {
    console.warn(`[400] malformed JSON body on ${req.method} ${req.originalUrl} from ${req.ip}`);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    console.warn(`[413] oversized body on ${req.method} ${req.originalUrl} from ${req.ip}`);
    return res.status(413).json({ error: 'Request body too large' });
  }

  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Validation error', details: messages });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // Capture unexpected 500 errors to Sentry (Sentry middleware already captures,
  // but this ensures coverage if errorHandler is used directly)
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }

  res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;
