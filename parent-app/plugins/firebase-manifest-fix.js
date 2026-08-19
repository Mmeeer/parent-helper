// Resolves the AndroidManifest merge conflict between expo-notifications and
// @react-native-firebase/messaging: both declare the Firebase default_notification_*
// meta-data. Keep the expo-notifications values and mark them as the winner.
const { withAndroidManifest } = require('expo/config-plugins');

const KEYS = [
  { name: 'com.google.firebase.messaging.default_notification_channel_id', attr: 'android:value' },
  { name: 'com.google.firebase.messaging.default_notification_color', attr: 'android:resource' },
];

module.exports = function withFirebaseManifestFix(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    if (!manifest.$['xmlns:tools']) manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const app = manifest.application && manifest.application[0];
    if (!app) return cfg;
    app['meta-data'] = app['meta-data'] || [];
    for (const { name, attr } of KEYS) {
      const md = app['meta-data'].find((m) => m.$ && m.$['android:name'] === name);
      if (md) md.$['tools:replace'] = attr;
    }
    return cfg;
  });
};
