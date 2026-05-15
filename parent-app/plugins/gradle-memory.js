const { withGradleProperties } = require("expo/config-plugins");

/**
 * Increase JVM memory for Gradle daemon to prevent Metaspace OOM
 * during :app:lintVitalAnalyzeRelease on EAS Build.
 */
module.exports = function gradleMemory(config) {
  return withGradleProperties(config, (config) => {
    // Remove existing org.gradle.jvmargs if present
    config.modResults = config.modResults.filter(
      (item) => !(item.type === "property" && item.key === "org.gradle.jvmargs")
    );

    // Add tuned JVM args: 2G heap + 512M metaspace
    config.modResults.push({
      type: "property",
      key: "org.gradle.jvmargs",
      value:
        "-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError",
    });

    // Limit parallel workers to reduce memory pressure on VPS
    const hasWorkers = config.modResults.some(
      (item) => item.type === "property" && item.key === "org.gradle.workers.max"
    );
    if (!hasWorkers) {
      config.modResults.push({
        type: "property",
        key: "org.gradle.workers.max",
        value: "2",
      });
    }

    return config;
  });
};
