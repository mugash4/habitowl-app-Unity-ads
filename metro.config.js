// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep existing asset extensions
config.resolver.assetExts.push('cjs');

// ✅ CRITICAL FIX: Disable package.json exports for Firebase compatibility
// This fixes the blank screen issue with Expo SDK 53 + Firebase
// Reference: https://github.com/expo/expo/issues/36598
// Reference: https://docs.expo.dev/versions/v53.0.0/config/metro/#es-module-resolution
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
