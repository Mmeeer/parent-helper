const admin = require('firebase-admin');
const User = require('../models/User');

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[FCM] Firebase credentials not configured. Push notifications disabled.');
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialized = true;
    console.log('[FCM] Firebase initialized successfully');
    return true;
  } catch (err) {
    console.error('[FCM] Firebase init failed:', err.message);
    return false;
  }
}

const ALERT_TITLES = {
  screen_time_limit: 'Screen Time Limit',
  new_app_installed: 'New App Installed',
  blocked_content: 'Blocked Content',
  geofence_trigger: 'Geofence Alert',
  device_offline: 'Device Offline',
  unusual_pattern: 'Unusual Activity',
  uninstall_attempt: 'Uninstall Attempt',
  sos: 'SOS Emergency',
  overlay_permission_revoked: 'Permission Revoked',
};

const ALERT_CHANNELS = {
  sos: 'sos_alerts',
  default: 'general_alerts',
};

/**
 * Send push notification to a parent user for an alert.
 * @param {string} parentId - User ID
 * @param {object} alert - Alert document (type, message, childId, data, _id)
 */
/**
 * Parent's NotificationSettings, enforced at send time. SOS is exempt from every
 * suppression (master toggle, per-type, quiet hours) — it's a safety feature.
 * Quiet-hour times are interpreted in server local time (TZ=Asia/Ulaanbaatar).
 */
function allowedBySettings(settings, type) {
  if (type === 'sos' || !settings) return true;
  if (settings.enabled === false) return false;
  if (settings.types && settings.types[type] === false) return false;
  const q = settings.quietHours;
  if (q?.enabled && /^\d{1,2}:\d{2}$/.test(q.start || '') && /^\d{1,2}:\d{2}$/.test(q.end || '')) {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = q.start.split(':').map(Number);
    const [eh, em] = q.end.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    const inQuiet = start <= end ? cur >= start && cur < end : cur >= start || cur < end;
    if (inQuiet) return false;
  }
  return true;
}

async function sendAlertNotification(parentId, alert) {
  if (!firebaseInitialized && !initFirebase()) return;

  try {
    const user = await User.findById(parentId).select('fcmTokens alertSettings').lean();
    if (!user?.fcmTokens?.length) return;
    if (!allowedBySettings(user.alertSettings, alert.type)) return;

    const tokens = user.fcmTokens.map((t) => t.token);
    const title = ALERT_TITLES[alert.type] || 'Prime Kids Alert';
    const isSos = alert.type === 'sos';

    const message = {
      notification: {
        title,
        body: alert.message,
      },
      data: {
        alertId: String(alert._id),
        type: alert.type,
        childId: String(alert.childId),
        // Include childName so the parent app can deep-link to LocationMap
        // (which expects a name in route.params) without an extra API round-trip.
        ...(alert.data?.childName ? { childName: String(alert.data.childName) } : {}),
        ...(alert.data?.lat ? { lat: String(alert.data.lat) } : {}),
        ...(alert.data?.lng ? { lng: String(alert.data.lng) } : {}),
      },
      android: {
        priority: isSos ? 'high' : 'normal',
        notification: {
          channelId: isSos ? ALERT_CHANNELS.sos : ALERT_CHANNELS.default,
          priority: isSos ? 'max' : 'high',
          sound: isSos ? 'sos_alarm' : 'default',
          ...(isSos ? { color: '#DC3545' } : {}),
        },
      },
      apns: {
        headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
        payload: {
          aps: {
            // 'critical' would require Apple's Critical Alerts entitlement (not granted);
            // 'time-sensitive' breaks through Focus and needs only the Time Sensitive
            // capability, which the parent app declares. Custom sound file is not bundled
            // in the iOS parent app yet, so use the default sound.
            sound: 'default',
            badge: 1,
            ...(isSos ? { 'interruption-level': 'time-sensitive' } : {}),
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message,
    });

    // Remove stale tokens that failed
    if (response.failureCount > 0) {
      const staleTokens = [];
      response.responses.forEach((resp, idx) => {
        if (resp.error?.code === 'messaging/registration-token-not-registered' ||
            resp.error?.code === 'messaging/invalid-registration-token') {
          staleTokens.push(tokens[idx]);
        }
      });

      if (staleTokens.length > 0) {
        await User.findByIdAndUpdate(parentId, {
          $pull: { fcmTokens: { token: { $in: staleTokens } } },
        });
        console.log(`[FCM] Removed ${staleTokens.length} stale token(s) for user ${parentId}`);
      }
    }

    console.log(`[FCM] Sent to user ${parentId}: ${response.successCount} ok, ${response.failureCount} failed`);
  } catch (err) {
    console.error(`[FCM] Error sending to user ${parentId}:`, err.message);
  }
}

/**
 * Send push notification for multiple alerts (batch from activity sync).
 */
async function sendBatchAlertNotifications(parentId, alerts) {
  if (!alerts?.length) return;
  if (!firebaseInitialized && !initFirebase()) return;

  try {
    const user = await User.findById(parentId).select('fcmTokens alertSettings').lean();
    if (!user?.fcmTokens?.length) return;
    // Same gate as the single path — quiet hours / toggles apply per alert type.
    alerts = alerts.filter((a) => allowedBySettings(user.alertSettings, a.type));
    if (!alerts.length) return;
    // For a single survivor, send the richer per-alert notification instead.
    if (alerts.length === 1) {
      return sendAlertNotification(parentId, alerts[0]);
    }

    const tokens = user.fcmTokens.map((t) => t.token);
    const hasSos = alerts.some((a) => a.type === 'sos');

    const message = {
      notification: {
        title: `${alerts.length} New Alerts`,
        body: alerts.map((a) => a.message).slice(0, 3).join('; ') + (alerts.length > 3 ? '...' : ''),
      },
      data: {
        type: 'batch',
        count: String(alerts.length),
      },
      android: {
        priority: hasSos ? 'high' : 'normal',
        notification: {
          channelId: hasSos ? ALERT_CHANNELS.sos : ALERT_CHANNELS.default,
        },
      },
      apns: {
        headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            ...(hasSos ? { 'interruption-level': 'time-sensitive' } : {}),
          },
        },
      },
    };

    await admin.messaging().sendEachForMulticast({ tokens, ...message });
  } catch (err) {
    console.error(`[FCM] Batch error for user ${parentId}:`, err.message);
  }
}

/**
 * Silent data push to a CHILD device (iOS): wakes the app so it can act on a command
 * even when its Socket.IO connection is suspended. Payload is data-only:
 *   { command: 'sync'|'locate'|'lock'|'unlock'|'unpair'|'rules:updated', params: <json string> }
 * @param {object} device - Device document (needs pushToken, platform, _id)
 * @param {string} command
 * @param {object} [params]
 */
async function sendDeviceCommand(device, command, params = {}) {
  if (!device?.pushToken) return false;
  if (!firebaseInitialized && !initFirebase()) return false;

  // lock/unlock (pause/resume) ship as VISIBLE pushes with mutable-content so the child
  // app's Notification Service Extension can enforce them even when the app was force-quit
  // (iOS never delivers silent pushes to a force-quit app). Other commands stay silent.
  const isEnforced = ['lock', 'pause', 'unlock', 'resume'].includes(String(command));
  const message = {
    token: device.pushToken,
    data: {
      command: String(command),
      params: JSON.stringify(params || {}),
      deviceId: String(device._id),
    },
    android: { priority: 'high' },
    apns: isEnforced
      ? {
          headers: {
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'apns-topic': 'com.parenthelper.child',
          },
          payload: {
            aps: {
              alert: {
                title: 'Prime Kids',
                body: String(command) === 'lock' || String(command) === 'pause'
                  ? 'Таны эцэг эх төхөөрөмжийг түр зогсоолоо.'
                  : 'Төхөөрөмж дахин ашиглахад бэлэн боллоо.',
              },
              sound: 'default',
              'mutable-content': 1,
              'content-available': 1,
            },
          },
        }
      : {
          headers: {
            'apns-push-type': 'background',
            'apns-priority': '5',
            'apns-topic': 'com.parenthelper.child',
          },
          payload: { aps: { 'content-available': 1 } },
        },
  };

  try {
    await admin.messaging().send(message);
    console.log(`[FCM] Device command '${command}' pushed to device ${device._id}`);
    return true;
  } catch (err) {
    const code = err?.code || '';
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
      const Device = require('../models/Device');
      await Device.updateOne({ _id: device._id }, { $set: { pushToken: null } }).catch(() => {});
      console.log(`[FCM] Cleared stale push token for device ${device._id}`);
    } else {
      console.error(`[FCM] Device command push failed for ${device._id}:`, err.message);
    }
    return false;
  }
}

module.exports = { initFirebase, sendAlertNotification, sendBatchAlertNotifications, sendDeviceCommand };
