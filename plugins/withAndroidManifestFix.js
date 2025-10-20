const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidManifestFix(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Add tools namespace if not already present
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Get the application element
    const application = androidManifest.manifest.application[0];

    // Find and fix IronSource activities
    if (application.activity) {
      application.activity.forEach((activity) => {
        // Fix InterstitialActivity
        if (activity.$['android:name'] === 'com.ironsource.sdk.controller.InterstitialActivity') {
          activity.$['android:theme'] = '@android:style/Theme.Translucent.NoTitleBar';
          activity.$['tools:replace'] = 'android:theme';
        }
        
        // Fix OpenUrlActivity
        if (activity.$['android:name'] === 'com.ironsource.sdk.controller.OpenUrlActivity') {
          activity.$['android:theme'] = '@android:style/Theme.Translucent.NoTitleBar';
          activity.$['tools:replace'] = 'android:theme';
        }
      });
    }

    return config;
  });
};
