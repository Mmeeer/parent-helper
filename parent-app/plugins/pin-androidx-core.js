const { withProjectBuildGradle } = require("expo/config-plugins");

/**
 * Pin androidx.core:core and androidx.core:core-ktx to 1.16.0
 * to avoid requiring compileSdk 36 and AGP 8.9.1+
 * (transitive dep androidx.core:core-ktx:1.17.0 pulls these in)
 */
module.exports = function pinAndroidxCore(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      const snippet = `
subprojects {
    project.configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.16.0'
            force 'androidx.core:core-ktx:1.16.0'
        }
    }
}`;
      // Append to the end of the root build.gradle
      if (!config.modResults.contents.includes("force 'androidx.core:core:1.16.0'")) {
        config.modResults.contents += snippet;
      }
    }
    return config;
  });
};
