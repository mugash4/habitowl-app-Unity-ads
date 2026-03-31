import { Alert, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORE_PROMPT_KEY = "habitowl_rate_prompt_state";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.mugash4.habitowl";
const PLAY_STORE_DEEP_LINK = "market://details?id=com.mugash4.habitowl";

class RateAppService {
  async getState() {
    try {
      const stored = await AsyncStorage.getItem(STORE_PROMPT_KEY);
      return stored
        ? JSON.parse(stored)
        : {
            positiveMoments: 0,
            lastPromptAt: null,
            rated: false,
            dontAskAgain: false,
          };
    } catch (error) {
      return {
        positiveMoments: 0,
        lastPromptAt: null,
        rated: false,
        dontAskAgain: false,
      };
    }
  }

  async saveState(nextState) {
    await AsyncStorage.setItem(STORE_PROMPT_KEY, JSON.stringify(nextState));
  }

  async trackPositiveMoment(weight = 1) {
    const state = await this.getState();
    const nextState = {
      ...state,
      positiveMoments: (state.positiveMoments || 0) + weight,
    };
    await this.saveState(nextState);
    return nextState;
  }

  async shouldPrompt() {
    const state = await this.getState();
    if (state.rated || state.dontAskAgain) return false;
    if ((state.positiveMoments || 0) < 5) return false;

    if (state.lastPromptAt) {
      const daysSinceLastPrompt =
        (Date.now() - new Date(state.lastPromptAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceLastPrompt < 14) return false;
    }

    return true;
  }

  async markPromptShown() {
    const state = await this.getState();
    await this.saveState({
      ...state,
      lastPromptAt: new Date().toISOString(),
    });
  }

  async markRated() {
    const state = await this.getState();
    await this.saveState({
      ...state,
      rated: true,
      lastPromptAt: new Date().toISOString(),
    });
  }

  async markDontAskAgain() {
    const state = await this.getState();
    await this.saveState({
      ...state,
      dontAskAgain: true,
      lastPromptAt: new Date().toISOString(),
    });
  }

  async promptIfEligible() {
    const shouldPrompt = await this.shouldPrompt();
    if (!shouldPrompt) return false;

    await this.markPromptShown();

    Alert.alert(
      "Enjoying HabitOwl? 🦉",
      "If HabitOwl is helping you stay consistent, a quick rating would really help more people discover it.",
      [
        {
          text: "No thanks",
          style: "cancel",
          onPress: () => this.markDontAskAgain(),
        },
        {
          text: "Later",
          style: "default",
        },
        {
          text: "Rate app",
          onPress: async () => {
            await this.markRated();
            if (Platform.OS === "android") {
              try {
                await Linking.openURL(PLAY_STORE_DEEP_LINK);
              } catch (error) {
                await Linking.openURL(PLAY_STORE_URL);
              }
            } else {
              await Linking.openURL(PLAY_STORE_URL);
            }
          },
        },
      ],
    );

    return true;
  }
}

export default new RateAppService();
