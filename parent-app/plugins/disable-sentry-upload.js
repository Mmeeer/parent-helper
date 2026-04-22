const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Disable Sentry source-map uploads during EAS builds.
 *
 * @sentry/react-native v6.x uses the io.sentry.android.gradle plugin which
 * exposes a `sentry { }` DSL block. The old approach of overriding project.ext
 * properties doesn't work with this version. We inject the sentry DSL block
 * to disable all auto-uploads, which is the officially supported method.
 *
 * Additionally, we remove the `apply from: .../sentry.gradle` line which runs
 * sentry-cli directly and requires an auth token even when the DSL flag is set.
 */
module.exports = function disableSentryUpload(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") return config;

    const marker = "// disable-sentry-upload-plugin";
    if (config.modResults.contents.includes(marker)) return config;

    // Remove the apply from sentry.gradle line that triggers sentry-cli upload
    config.modResults.contents = config.modResults.contents.replace(
      /apply from: new File\(.*sentry\.gradle.*\)\n?/g,
      `${marker}\n// sentry.gradle apply removed — uploads disabled\n`
    );

    // Also inject sentry DSL block to disable uploads (belt-and-suspenders)
    const sentryBlock = `
sentry {
    autoUploadSourceMap = false
    autoUploadNativeSymbols = false
    uploadNativeSymbols = false
    autoUploadProguardMapping = false
    autoInstallation { enabled = false }
}
`;

    // Insert before the first android { block if present, else append
    if (config.modResults.contents.includes("android {")) {
      config.modResults.contents = config.modResults.contents.replace(
        "android {",
        `${sentryBlock}\nandroid {`
      );
    } else {
      config.modResults.contents += `\n${sentryBlock}`;
    }

    return config;
  });
};
