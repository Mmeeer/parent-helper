const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * CallPro Text SMS client (REST API v1 — api-text.callpro.mn).
 * Wire format (official "CallPro Text REST API" doc):
 *   POST {CALLPRO_API_URL}/send   headers: x-api-key   body: { from, to, text }
 *   → 200 { "status": "queued", "message_id": "a1b2c3d4e5" }
 *   Errors: 401 bad key, 402 unpaid, 403 blocked number, 422 validation…
 *   Delivery: GET {CALLPRO_API_URL}/{message_id}
 *
 * Env:
 *   CALLPRO_API_URL   https://api-text.callpro.mn/v1/sms
 *   CALLPRO_API_KEY   account API key (x-api-key header)
 *   CALLPRO_FROM      sender line number, e.g. 72228700
 *
 * Unconfigured → isConfigured() false and sendSms() resolves { disabled: true },
 * so OTP endpoints degrade gracefully in dev / before credentials exist.
 */
function isConfigured() {
  return Boolean(process.env.CALLPRO_API_URL && process.env.CALLPRO_API_KEY && process.env.CALLPRO_FROM);
}

function request(method, url, body) {
  const u = new URL(url);
  const payload = body ? JSON.stringify(body) : null;
  const client = u.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = client.request(u, {
      method,
      timeout: 15000,
      headers: {
        'x-api-key': process.env.CALLPRO_API_KEY,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('timeout', () => { req.destroy(new Error('CallPro timeout')); });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function sendSms(phone, text) {
  if (!isConfigured()) {
    console.warn('[SMS] CallPro not configured — message not sent:', phone);
    return { disabled: true };
  }
  // 8-digit local format is enough per the docs; +976/976 prefixes also work.
  const to = phone.replace(/^\+/, '');
  const base = process.env.CALLPRO_API_URL.replace(/\/$/, '');
  const res = await request('POST', `${base}/send`, { from: process.env.CALLPRO_FROM, to, text });
  let parsed = null;
  try { parsed = JSON.parse(res.body); } catch { /* handled below */ }
  if (res.status === 200 && parsed && parsed.message_id) {
    return { ok: true, messageId: parsed.message_id, status: parsed.status };
  }
  const reason = (parsed && (parsed.error || JSON.stringify(parsed.issues))) || res.body.slice(0, 200);
  throw new Error(`CallPro HTTP ${res.status}: ${reason}`);
}

/** Delivery status of a sent message: { delivered, messages: [{ events }] } */
async function getDeliveryStatus(messageId) {
  if (!isConfigured()) return { disabled: true };
  const base = process.env.CALLPRO_API_URL.replace(/\/$/, '');
  const res = await request('GET', `${base}/${encodeURIComponent(messageId)}`);
  if (res.status !== 200) throw new Error(`CallPro HTTP ${res.status}: ${res.body.slice(0, 200)}`);
  return JSON.parse(res.body);
}

module.exports = { isConfigured, sendSms, getDeliveryStatus };
