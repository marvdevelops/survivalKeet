// This file is intentionally a no-op.
// MapLibre v11 uses Swift Package Manager (not CocoaPods) for its iOS SDK.
// The official @maplibre/maplibre-react-native app.plugin.js handles everything:
//   - Injects `$MLRN.post_install(installer)` into the Podfile post_install block
//   - The post_install hook adds the SPM dependency at pod-install time
// No custom pod injection is needed or correct.
module.exports = (config) => config;
