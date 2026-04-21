import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN =
  Constants.expoConfig?.extra?.sentryDsn ||
  process.env.EXPO_PUBLIC_SENTRY_DSN ||
  '';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  const release = Constants.expoConfig?.version
    ? `com.parenthelper.parent@${Constants.expoConfig.version}`
    : 'com.parenthelper.parent@1.0.0';

  Sentry.init({
    dsn: SENTRY_DSN,
    release,
    dist: Constants.expoConfig?.extra?.sentryDist || '1',
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    debug: __DEV__,
  });

  console.log(`[Sentry] Initialized — release: ${release}`);
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error(error);
  if (SENTRY_DSN) {
    if (context) {
      Sentry.withScope((scope) => {
        scope.setExtras(context);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  }
}

export function setUser(id: string, email?: string) {
  Sentry.setUser({ id, email });
}

export function clearUser() {
  Sentry.setUser(null);
}

/** Trigger a test crash for verifying Sentry integration */
export function triggerTestCrash() {
  throw new Error('Sentry test crash from parent-app');
}

export { Sentry };
