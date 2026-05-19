# App-Store Review Access

This document describes the dedicated review path for Google Play / App Store
reviewers and **how to disable it after approval**.

## Reviewer credentials (put these in the store listing's review notes)

| Field | Value |
|-------|-------|
| Parent-app email | `review@parenthelper.com` |
| Parent-app password | `ReviewTest2026!` |
| Child-app pairing code | `PRIME888` |

The account is email-verified and has an **active 12-month subscription
(maxKids 5)**. It is pre-populated with two children (Saraa, Bat), a paired
demo device, geofences, 5 days of activity logs and several alerts, so the
parent dashboard is fully populated the moment the reviewer logs in.

## The single-device review flow (solves the two-device problem)

A reviewer normally cannot exercise a companion child app: it requires a
*second* device running the parent app to generate a pairing code. To remove
that blocker:

1. Reviewer logs into the **parent app** with the credentials above and sees a
   real, populated account (children, activity, location, alerts, rules).
2. Reviewer installs the **child app** on the *same single device* and enters
   the fixed pairing code **`PRIME888`**. It pairs instantly into the demo
   child — no parent app step, no second device, no subscription gate.

The demo code is **reusable** (matched from env, never consumed) and
case-insensitive, so every reviewer and every retry works.

## What was implemented (all env-gated, fully reversible)

A single helper, `backend/src/utils/reviewAccess.js`, reads two env vars. When
they are unset every behaviour below is **inert** (zero behavioural change):

| Env var | Effect |
|---------|--------|
| `REVIEW_ACCOUNT_EMAIL` | The parent app never returns 402/403 for this one email: `requireSubscription` and `emailVerified` middleware short-circuit, and `devicesController.pair` skips the subscription/expiry/device-cap 402s. |
| `REVIEW_DEMO_PAIRING_CODE` | `devicesController.completePairing` treats this exact code (6–8 alphanumeric, to satisfy the validator) as a reusable pairing code that always pairs into the review account's first demo child and returns a fresh device token. |

Security: the demo code can **only** ever pair into the review account's own
demo child — it cannot target a real family's device, so a leaked code at worst
writes junk into our own demo account. The gate bypasses are scoped to exactly
one email string. Nothing here weakens behaviour for any real user.

## (Re)seed the demo account

Idempotent — safe to run any time (e.g. to refresh the subscription expiry or
reset demo data before a re-review):

```sh
cd /root/projects/parent-helper/backend && node scripts/seed-review-account.js
```

## Disable AFTER approval (1 minute)

1. Remove these two lines from `backend/.env`:
   ```
   REVIEW_ACCOUNT_EMAIL=review@parenthelper.com
   REVIEW_DEMO_PAIRING_CODE=PRIME888
   ```
2. Restart the service (`parent-helper-api`). The review code paths are now
   completely inert — they require both env vars to do anything.
3. Optional: delete the review user / `PK-REVIEW-2026` subscription key and the
   demo children from the `parent_helper` database.

The code can be left in place permanently with the env vars removed; it has no
effect without them.
