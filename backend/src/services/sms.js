const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * CallPro (MessagePro) SMS client.
 * Wire format (from CallPro's own integration library):
 *   GET {CALLPRO_API_URL}/send?key=...&from=...&to=...&text=...
 *   → JSON array: [{ "Result": "SUCCESS"|..., "Message ID": n, "Reason": "..." }]
 *
 * Env (all three come from CallPro when the account is provisioned):
 *   CALLPRO_API_URL   e.g. https://api.messagepro.mn
 *   CALLPRO_API_KEY   account API key
 *   CALLPRO_FROM      the sender short number
 *
 * Unconfigured → isConfigured() false and sendSms() resolves { disabled: true },
 * so OTP endpoints degrade gracefully in dev / before credentials exist.
 */
function isConfigured() {
  return Boolean(process.env.CALLPRO_API_URL && process.env.CALLPRO_API_KEY && process.env.CALLPRO_FROM);
}

function sendSms(phone, text) {
  if (!isConfigured()) {
    console.warn('[SMS] CallPro not configured — message not sent:', phone);
    return Promise.resolve({ disabled: true });
  }
  const u = new URL('/send', process.env.CALLPRO_API_URL);
  u.searchParams.set('key', process.env.CALLPRO_API_KEY);
  u.searchParams.set('from', process.env.CALLPRO_FROM);
  u.searchParams.set('to', phone.replace(/^\+/, '')); // local format; CallPro serves MN numbers
  u.searchParams.set('text', text);

  const client = u.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = client.get(u, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`CallPro HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        try {
          const parsed = JSON.parse(body);
          const first = Array.isArray(parsed) ? parsed[0] : parsed;
          if (first && String(first.Result || '').toUpperCase().includes('SUCCESS')) {
            resolve({ ok: true, messageId: first['Message ID'] });
          } else {
            reject(new Error(`CallPro rejected: ${JSON.stringify(first).slice(0, 200)}`));
          }
        } catch {
          reject(new Error(`CallPro unparseable response: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('CallPro timeout')); });
    req.on('error', reject);
  });
}

module.exports = { isConfigured, sendSms };
