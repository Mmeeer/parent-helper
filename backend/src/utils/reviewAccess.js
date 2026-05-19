/**
 * App-store review access helpers.
 *
 * This whole module is INERT unless the corresponding env vars are set, so the
 * entire review path can be disabled after Google approval by removing two
 * lines from backend/.env and restarting the service:
 *
 *   REVIEW_ACCOUNT_EMAIL    — the single account that bypasses the
 *                             subscription + email-verification gates so the
 *                             parent app never shows a 402/403 to a reviewer.
 *   REVIEW_DEMO_PAIRING_CODE — a fixed, reusable pairing code (6-8 alphanumeric,
 *                             to satisfy the devicePairing validator) that the
 *                             child app can redeem on a single device without a
 *                             second device or the parent generating a code.
 *
 * Security note: the demo code can ONLY ever pair a device into the review
 * account's own demo child (see devicesController.completePairing). A leaked
 * code therefore cannot be used to monitor a real family's device — at worst
 * it writes junk into our own demo account. The gate bypasses are scoped to
 * exactly one email string.
 */

function reviewEmail() {
  const v = (process.env.REVIEW_ACCOUNT_EMAIL || '').trim().toLowerCase();
  return v || null;
}

// True when `email` is the configured review account (and the feature is on).
function isReviewEmail(email) {
  const r = reviewEmail();
  return !!r && !!email && String(email).trim().toLowerCase() === r;
}

// The configured demo pairing code, normalized, or null when the feature is off.
function reviewDemoCode() {
  const v = (process.env.REVIEW_DEMO_PAIRING_CODE || '').trim().toUpperCase();
  return v || null;
}

module.exports = { reviewEmail, isReviewEmail, reviewDemoCode };
