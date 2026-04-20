import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = ''; // Set your DSN here or via EAS env variable

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    release: 'com.parenthelper.parent@1.0.0',
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    debug: __DEV__,
  });

  console.log('[Sentry] Initialized for parent-app');
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

export { Sentry };
