const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Disable Sentry source-map uploads during EAS builds.
 *
 * The @sentry/react-native Expo plugin injects `apply from: …/sentry.gradle`
 * into android/app/build.gradle. That script defines shouldSentryAutoUploadGeneral()
 * based on SENTRY_DISABLE_AUTO_UPLOAD env var, but the env var doesn't always
 * reach the Gradle daemon in EAS cloud builds.
 *
 * This plugin overrides the function *after* sentry.gradle defines it,
 * so the upload task's `onlyIf` guard always returns false.
 */
module.exports = function disableSentryUpload(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") return config;

    const marker = "// disable-sentry-upload-plugin";
    if (config.modResults.contents.includes(marker)) return config;

    const override = `
${marker}
project.ext.shouldSentryAutoUploadGeneral = { -> return false }
project.ext.shouldSentryAutoUploadNative  = { -> return false }
`;

    // Insert override right after the sentry.gradle apply line
    const sentryApplyPattern = /apply from: new File\(.*sentry\.gradle.*\)/;
    if (sentryApplyPattern.test(config.modResults.contents)) {
      config.modResults.contents = config.modResults.contents.replace(
        sentryApplyPattern,
        (match) => `${match}\n${override}`
      );
    } else {
      // Fallback: append at the end
      config.modResults.contents += `\n${override}`;
    }

    return config;
  });
};
