import AsyncStorage from "@react-native-async-storage/async-storage";

const DISMISSED_TIPS_KEY = "habitowl_dismissed_tips";
const TIPS_ENABLED_KEY = "habitowl_tips_enabled";
const SEEN_GUIDES_KEY = "habitowl_seen_guides";

class TipsService {
  async areTipsEnabled() {
    const stored = await AsyncStorage.getItem(TIPS_ENABLED_KEY);
    return stored !== "false";
  }

  async setTipsEnabled(enabled) {
    await AsyncStorage.setItem(TIPS_ENABLED_KEY, enabled ? "true" : "false");
  }

  async getDismissedTips() {
    try {
      const stored = await AsyncStorage.getItem(DISMISSED_TIPS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  async dismissTip(tipId) {
    const dismissed = await this.getDismissedTips();
    if (!dismissed.includes(tipId)) {
      dismissed.push(tipId);
      await AsyncStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify(dismissed));
    }
  }

  async shouldShowTip(tipId) {
    const enabled = await this.areTipsEnabled();
    if (!enabled) return false;
    const dismissed = await this.getDismissedTips();
    return !dismissed.includes(tipId);
  }

  async resetTips() {
    await AsyncStorage.multiRemove([DISMISSED_TIPS_KEY, SEEN_GUIDES_KEY]);
    await AsyncStorage.setItem(TIPS_ENABLED_KEY, "true");
  }

  async getSeenGuides() {
    try {
      const stored = await AsyncStorage.getItem(SEEN_GUIDES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  async hasSeenGuide(screenId) {
    const enabled = await this.areTipsEnabled();
    if (!enabled) return true;
    const guides = await this.getSeenGuides();
    return guides.includes(screenId);
  }

  async markGuideSeen(screenId) {
    const guides = await this.getSeenGuides();
    if (!guides.includes(screenId)) {
      guides.push(screenId);
      await AsyncStorage.setItem(SEEN_GUIDES_KEY, JSON.stringify(guides));
    }
  }
}

export default new TipsService();
