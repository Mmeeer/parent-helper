# Phone OTP via CallPro (MessagePro) — setup

## What you need from CallPro
Email info@callpro.mn (or your sales rep) and ask for SMS API access for your
CallPro Text account. They provision three values:

| Env var | What it is | Example |
|---|---|---|
| `CALLPRO_API_URL` | API base URL they give you | `https://api.messagepro.mn` |
| `CALLPRO_API_KEY` | account API key | `abc123…` |
| `CALLPRO_FROM` | your sender short number | `72xxxxxx` |
| `OTP_REQUIRED` | set `true` to enforce OTP at signup | `true` |

Wire format (verified from CallPro's own client library):
`GET {url}/send?key=…&from=…&to=…&text=…` → `[{"Result":"SUCCESS","Message ID":n}]`
and `GET {url}/getstatus?key=…&id=…` for delivery status.

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
