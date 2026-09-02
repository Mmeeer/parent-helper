# Phone OTP via CallPro (MessagePro) — setup

## What you need from CallPro
Email info@callpro.mn (or your sales rep) and ask for SMS API access for your
CallPro Text account. They provision three values:

| Env var | What it is | Example |
|---|---|---|
| `CALLPRO_API_URL` | API base URL they give you | `https://api-text.callpro.mn/v1/sms` |
| `CALLPRO_API_KEY` | account API key | `abc123…` |
| `CALLPRO_FROM` | your sender short number | `72xxxxxx` |
| `OTP_REQUIRED` | set `true` to enforce OTP at signup | `true` |

Wire format (official "CallPro Text REST API v1" doc, verified live 2026-09-02):
`POST {url}/send` with header `x-api-key: <key>` and JSON body `{ from, to, text }`
→ `{ "status": "queued", "message_id": "…" }`. Delivery check: `GET {url}/{message_id}`.
8-digit local numbers are fine; `+976`/`976` prefixes also accepted. Cyrillic texts
split at 70 chars/segment (Latin 160) — keep OTP texts short and Latin.
The carrier appends the "Prime Kids" brand name to delivered texts.


## Behaviour
- Without the env vars, everything keeps working: signup has no OTP step
  (`/config/app` reports `otpEnabled:false`), and `/auth/otp/request` responds
  with a `devCode` in non-production so the flow can be tested end-to-end.
- With the env vars + `OTP_REQUIRED=true`: signup shows Send code → 6-digit
  entry; register requires the verification proof; "forgot password" gains an
  SMS path (`/auth/reset-password-otp`).
- Limits: codes last 5 min, 1 SMS/min per phone, 5 sends per window,
  5 wrong attempts; codes stored hashed; responses never reveal whether a
  phone is registered.

## Smoke test (after deploy, before CallPro creds)
```sh
B=https://primekids.masterclass.mn/parent-helper
curl -s -X POST $B/auth/otp/request -H 'Content-Type: application/json' -d '{"phone":"+97688001122","purpose":"register"}'
# → {"status":"sent","devCode":"123456"}   (devCode only while SMS unconfigured, non-prod)
curl -s -X POST $B/auth/otp/verify -H 'Content-Type: application/json' -d '{"phone":"+97688001122","code":"123456","purpose":"register"}'
# → {"verified":true,"otpToken":"…"}
```
With CallPro live, the same first call sends a real SMS:
"Prime Kids: Tanii batalgaajuulakh kod: 123456".
