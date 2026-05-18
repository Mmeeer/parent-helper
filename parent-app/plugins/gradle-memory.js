const {
  withGradleProperties,
  withAppBuildGradle,
} = require("expo/config-plugins");

/**
 * Increase JVM memory for Gradle daemon to prevent Metaspace OOM
 * during :app:lintVitalAnalyzeRelease on EAS Build.
 *
 * Two-pronged fix:
 * 1. Bump heap to 2G + metaspace to 512M + G1GC in gradle.properties
 * 2. Disable lintVitalRelease in app/build.gradle (the task that OOMs)
 */
module.exports = function gradleMemory(config) {
  // --- 1. gradle.properties: JVM memory ---
  config = withGradleProperties(config, (config) => {
    // Remove existing org.gradle.jvmargs if present
    config.modResults = config.modResults.filter(
      (item) =>
        !(item.type === "property" && item.key === "org.gradle.jvmargs")
    );

    // 2G heap + 512M metaspace + G1GC for better memory reclamation
    config.modResults.push({
      type: "property",
      key: "org.gradle.jvmargs",
      value:
        "-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -XX:+UseG1GC",
    });

    // Limit parallel workers to reduce memory pressure
    const hasWorkers = config.modResults.some(
      (item) =>
        item.type === "property" && item.key === "org.gradle.workers.max"
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

  // --- 2. app/build.gradle: disable lint vital (the OOM trigger) ---
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      const lintBlock = `
android {
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
}`;
      if (!config.modResults.contents.includes("checkReleaseBuilds false")) {
        config.modResults.contents += lintBlock;
      }
    }
    return config;
  });

  return config;
};
