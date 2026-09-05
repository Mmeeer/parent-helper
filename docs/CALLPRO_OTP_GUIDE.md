# CallPro Phone-OTP Integration Guide

Portable guide for adding SMS one-time-password verification to any of our
services (written for **Prime English**, extracted from the working
**Prime Kids** implementation). Hand this whole file to the developer or AI
assistant doing the integration — it contains the SMS provider's wire format,
a proven reference implementation, and the production lessons that cost us
real debugging time.

> **Secrets note:** the CallPro API key is NOT in this document. It lives in
> the CallPro account (primekidsmongolia@gmail.com) and in the Prime Kids
> server's `backend/.env`. Copy it from either place into the new service's
> `.env`. Never commit it.

---

## 1. The SMS provider: CallPro Text REST API v1

- **Base URL:** `https://api-text.callpro.mn/v1/sms`
- **Auth:** `x-api-key: <key>` request header
- **Sender number (`from`):** `72228700` (our provisioned line; pool 72228700–09)
- Verified live 2026-09-02: queued→delivered in ~30 ms; the carrier appends
  the brand name ("Prime Kids") to every delivered text automatically.

### Send an SMS
```
POST https://api-text.callpro.mn/v1/sms/send
x-api-key: <key>
Content-Type: application/json

{ "from": "72228700", "to": "99112233", "text": "..." }
```
Success `200`:
```json
{ "status": "queued", "message_id": "a1b2c3d4e5" }
```
Errors: `400` bad param · `401` bad/missing key · `402` payment overdue ·
`403` blocked number · `404` tenant/number not found · `422` validation
(`{"issues":[...]}`) · `500` server.

### Delivery status
```
GET https://api-text.callpro.mn/v1/sms/{message_id}     (x-api-key header)
```
→ `{ "uniqueId", "messageCount", "delivered": true|false, "messages": [{ "events": [...] }] }`
Event types: `QUEUED`, `DELIVERED`, `UNDELIVERED`, `CHANGED`, `RATE`.

### Daily quota / balance
```
GET https://api-text.callpro.mn/v1/sms/tenant/daily?operator=unitel   (skytel|mobicom|unitel)
```
→ `{ "balance", "current", "total_message" }` — our plan has a daily message
allowance; check this if sends start failing with 402-ish behavior.

### Message rules
- **Cyrillic = 70 chars/segment, Latin = 160.** Keep OTP texts short and in
  transliterated Latin so each code costs one segment:
  `Prime English: Tanii batalgaajuulakh kod: 123456`
- Phone formats accepted: 8-digit local (`99112233`), `+976…`, `976…`.
  International: country code + number.

---

## 2. Backend reference implementation (Node/Express/Mongoose)

Three pieces, copied from Prime Kids (`backend/src/services/sms.js`,
`backend/src/models/PhoneOtp.js`, `backend/src/controllers/otpController.js`).
All three are dependency-free (no npm SMS SDK — plain `https`).

### 2.1 Environment
```bash
CALLPRO_API_URL=https://api-text.callpro.mn/v1/sms
CALLPRO_API_KEY=<copy from CallPro account or Prime Kids .env>
CALLPRO_FROM=72228700
OTP_REQUIRED=true          # false/absent = OTP UI hidden, endpoints inert
OTP_TTL_MINUTES=60         # optional; default 60
```
The client must degrade gracefully when unconfigured: `isConfigured()` returns
false and `sendSms()` resolves `{ disabled: true }` — so dev environments work
without credentials (and can expose the code as `devCode` in non-production).

### 2.2 SMS client (`services/sms.js`)
Key points (full file in the Prime Kids repo):
- `POST {base}/send` with the `x-api-key` header and JSON body; treat
  `200 + message_id` as success, everything else throws with the parsed
  `error`/`issues` in the message.
- Strip a leading `+` from the phone; 8-digit local numbers are fine.
- Protocol-aware (http/https by URL) if you ever point it at a mock.
- Export `getDeliveryStatus(messageId)` for debugging.

### 2.3 OTP storage (`models/PhoneOtp.js`)
```js
{ phone, purpose: 'register'|'login'|'reset', codeHash,   // sha256, never the raw code
  attempts, sentCount, lastSentAt, expiresAt }
// one active code per phone+purpose:
schema.index({ phone: 1, purpose: 1 }, { unique: true });
// ⚠️ TTL is GARBAGE COLLECTION ONLY — see §4.1:
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
```

### 2.4 Endpoints (`controllers/otpController.js`)
- `POST /auth/otp/request { phone, purpose }`
  - Validate phone (`/^\+?\d{6,20}$/`).
  - **Enumeration protection:** for `login`/`reset` on an unknown phone,
    return `{ status: 'sent' }` anyway (send nothing). For `register` on a
    known phone return 409 "already registered".
  - **Rate limits:** 60 s resend cooldown per phone+purpose; max 5 sends per
    active code window; max 5 verify attempts per code.
  - Generate 6-digit code (`crypto.randomInt(100000, 1000000)`), store
    **sha256 hash** only, upsert the phone+purpose row, send the SMS.
  - **If the SMS send throws, roll back `lastSentAt` (and `sentCount`)**
    before rethrowing — otherwise a failed send burns the user's cooldown.
  - Dev convenience: when SMS is unconfigured AND `NODE_ENV !== 'production'`,
    include `devCode` in the response.
- `POST /auth/otp/verify { phone, code, purpose }`
  - Reject if row missing, `expiresAt < now`, attempts exhausted; increment
    `attempts` on wrong code; **delete the row on success** (single use).
  - On success return `{ verified: true, otpToken }` where `otpToken` is a
    **10-minute JWT** `{ phone, purpose, otp: true }` signed with the app's
    JWT secret — proof-of-verification consumed by the next step.
- Registration/reset handlers then require and verify `otpToken` (matching
  phone + purpose) when `otpRequired()` is true:
  `otpRequired = () => sms.isConfigured() && process.env.OTP_REQUIRED === 'true'`.
- `POST /auth/reset-password-otp { phone, code, newPassword }` — verifies the
  code inline, sets the new password, invalidates existing sessions.

### 2.5 Feature flag for the app
Expose a tiny public config endpoint (no auth), e.g. `GET /config/app` →
`{ "otpEnabled": true }` driven by `otpRequired()`. The mobile/web client asks
this to decide whether to show OTP screens — so turning OTP on/off is a pure
server-side switch, no client release needed.

---

## 3. Client-side flow (what the Prime Kids app does)

1. **Signup:** user enters phone → `otp/request(register)` → 6-digit input
   screen → `otp/verify` → registration call includes `otpToken`.
2. **Password reset:** phone → `otp/request(reset)` → code + new password →
   `reset-password-otp`.
3. **Resend button:** disabled behind a **2-minute countdown** client-side
   (server enforces 60 s regardless — the UI timer is UX, not security).
4. Fetch `otpEnabled` from the config endpoint at app start / screen focus;
   hide all OTP UI when false.

---

## 4. Production lessons (each of these was a real incident)

### 4.1 ⚠️ Clock skew vs. Mongo TTL — the "code expired every time" bug
Our first version stored `expiresAt = now + 5min` with a TTL index of
`expireAfterSeconds: 0`. Mongo's TTL monitor runs on the **database server's
clock**; ours was skewed, so codes were deleted before users could type them —
every signup saw "code expired". Defense in depth:
- Code validity **60 minutes**, enforced by comparing `expiresAt` in
  application code only.
- TTL index purges **24 h after** expiry (`expireAfterSeconds: 86400`) —
  garbage collection, never enforcement.
- Fix the clock itself on every server:
  `timedatectl set-timezone Asia/Ulaanbaatar && timedatectl set-ntp true`.

### 4.2 Optional email + unique index
If accounts are phone-first with optional email: never store `email: null` —
omit the field (`email: email || undefined`) and make the unique index
**sparse**. A legacy non-sparse index makes every second blank-email signup
fail with "Email already registered". If migrating an existing collection:
unset nulls, drop the old index, rebuild sparse — ideally as an idempotent
startup migration, not a manual deploy note (deploy notes don't get run).

### 4.3 Misc
- Hash codes (sha256) — a DB leak must not leak live codes.
- Delete the OTP row on successful verify — codes are single-use.
- Keep the SMS text Latin and short (§1 segment rules).
- The `otpToken` JWT keeps `otp/verify` decoupled from registration — the
  client can verify first and submit the form a few minutes later.
- Test wire-level before going live:
  ```bash
  curl -s -X POST "$CALLPRO_API_URL/send" -H "x-api-key: $CALLPRO_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"from":"72228700","to":"<your number>","text":"Prime English test"}'
  ```

---

## 5. Smoke test (end to end, after deploy)

```bash
B=https://<prime-english-host>/api
# 1. request
curl -s -X POST $B/auth/otp/request -H 'Content-Type: application/json' \
  -d '{"phone":"99873993","purpose":"register"}'
# → {"status":"sent"} and an SMS arrives from 72228700
# 2. verify (code from the SMS)
curl -s -X POST $B/auth/otp/verify -H 'Content-Type: application/json' \
  -d '{"phone":"99873993","code":"123456","purpose":"register"}'
# → {"verified":true,"otpToken":"..."}
# 3. wrong code 5× → "Too many attempts"; immediate re-request → 429 cooldown
```

Reference files in the Prime Kids repo (`parent-helper`):
`backend/src/services/sms.js` · `backend/src/models/PhoneOtp.js` ·
`backend/src/controllers/otpController.js` · `backend/src/config/db.js`
(startup migrations) · `backend/OTP_SETUP.md` (ops runbook) ·
`parent-app/src/hooks/useResendCooldown.ts` and
`parent-app/src/screens/auth/RegisterScreen.tsx` (client flow).
