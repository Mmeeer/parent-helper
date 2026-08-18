/**
 * Screenshot / UI-test hooks. Active ONLY in development bundles (`__DEV__`) and only when the
 * matching EXPO_PUBLIC_DEMO_* variables are set at Metro start, e.g.
 *   EXPO_PUBLIC_DEMO_LOGIN=1 EXPO_PUBLIC_DEMO_SCREEN=LocationMap npx expo start
 * Release bundles have __DEV__ === false, so this is inert in TestFlight / App Store builds.
 */
export const DEMO_LOGIN: boolean = __DEV__ && process.env.EXPO_PUBLIC_DEMO_LOGIN === '1';
export const DEMO_EMAIL = process.env.EXPO_PUBLIC_DEMO_EMAIL ?? 'review@parenthelper.com';
export const DEMO_PASSWORD = process.env.EXPO_PUBLIC_DEMO_PASSWORD ?? '';
/** Route to open after auth: a stack route (LocationMap, Reports, Geofences, ScreenTimeRules,
 *  WebFilter, AppRules, ChildDetail, DevicesList) or "MainTabs:<Tab>" (Dashboard, Alerts, Settings). */
export const DEMO_SCREEN: string | undefined = __DEV__ ? process.env.EXPO_PUBLIC_DEMO_SCREEN : undefined;
