import { Platform } from "react-native";

export const ADMOB_CONFIG = {
  AD_UNIT_IDS: {
    ANDROID: {
      BANNER: "ca-app-pub-2371616866592450/1677929899",
      INTERSTITIAL: "ca-app-pub-2371616866592450/8051766556",
      REWARDED: "ca-app-pub-2371616866592450/9388898951",
    },
    IOS: {
      BANNER: "ca-app-pub-2371616866592450/1677929899",
      INTERSTITIAL: "ca-app-pub-2371616866592450/8051766556",
      REWARDED: "ca-app-pub-2371616866592450/9388898951",
    },
  },

  // Dialed down for a better free-user experience.
  INTERSTITIAL_COOLDOWN: 90000,
  MAX_INTERSTITIALS_PER_SESSION: 3,

  DEBUG_MODE: false,
  AUTO_LOAD_ADS: true,

  getRequestOptions: () => ({
    requestNonPersonalizedAdsOnly: false,
  }),
};

export const getAdUnitId = (adType) => {
  const platform = Platform.OS === "ios" ? "IOS" : "ANDROID";
  return ADMOB_CONFIG.AD_UNIT_IDS[platform][adType];
};

export default ADMOB_CONFIG;
