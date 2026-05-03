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
async function sendAlertNotification(parentId, alert) {
  if (!firebaseInitialized && !initFirebase()) return;

  try {
    const user = await User.findById(parentId).select('fcmTokens').lean();
    if (!user?.fcmTokens?.length) return;

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
        payload: {
          aps: {
            sound: isSos ? 'sos_alarm.caf' : 'default',
            badge: 1,
            ...(isSos ? { 'interruption-level': 'critical' } : {}),
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
  // For batch, send a summary notification instead of flooding
  if (alerts.length === 1) {
    return sendAlertNotification(parentId, alerts[0]);
  }

  if (!firebaseInitialized && !initFirebase()) return;

  try {
    const user = await User.findById(parentId).select('fcmTokens').lean();
    if (!user?.fcmTokens?.length) return;

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
    };

    await admin.messaging().sendEachForMulticast({ tokens, ...message });
  } catch (err) {
    console.error(`[FCM] Batch error for user ${parentId}:`, err.message);
  }
}

module.exports = { initFirebase, sendAlertNotification, sendBatchAlertNotifications };
