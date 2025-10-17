import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AIService {
  constructor() {
    this.apiProvider = 'deepseek'; // Default to DeepSeek
    this.apiKeys = {};
    this.loadApiKeys();
  }

  async loadApiKeys() {
    try {
      const keys = await AsyncStorage.getItem('ai_api_keys');
      if (keys) {
        this.apiKeys = JSON.parse(keys);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }

  async saveApiKeys(keys) {
    try {
      this.apiKeys = { ...this.apiKeys, ...keys };
      await AsyncStorage.setItem('ai_api_keys', JSON.stringify(this.apiKeys));
    } catch (error) {
      console.error('Error saving API keys:', error);
    }
  }

  async setApiProvider(provider) {
    this.apiProvider = provider;
    await AsyncStorage.setItem('ai_provider', provider);
  }

  async getApiProvider() {
    try {
      const provider = await AsyncStorage.getItem('ai_provider');
      if (provider) {
        this.apiProvider = provider;
      }
      return this.apiProvider;
    } catch (error) {
      return 'deepseek';
    }
  }

  async generateHabitSuggestions(userProfile, currentHabits) {
    const prompt = `Based on this user profile and current habits, suggest 5 new helpful habits:
    
    User Profile: ${JSON.stringify(userProfile)}
    Current Habits: ${currentHabits.map(h => h.name).join(', ')}
    
    Respond with a JSON array of objects with: name, description, category, difficulty (1-5), estimatedTime`;

    try {
      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating habit suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  async generateMotivationalMessage(habit, streak, timeOfDay) {
    const prompt = `Generate a short, encouraging message for someone with a ${streak}-day streak on the habit: ${habit.name}. Time: ${timeOfDay}. Keep it under 50 words.`;

    try {
      const response = await this.callAI(prompt);
      return response.trim();
    } catch (error) {
      return this.getFallbackMotivationalMessage(habit, streak);
    }
  }

  async analyzeHabitProgress(habitData) {
    const prompt = `Analyze this habit progress data and provide insights:
    
    ${JSON.stringify(habitData)}
    
    Provide insights on: patterns, success rate, recommendations for improvement. Keep response under 200 words.`;

    try {
      const response = await this.callAI(prompt);
      return response;
    } catch (error) {
      return "Your progress looks good! Keep maintaining consistency for better results.";
    }
  }

  async callAI(prompt) {
    const provider = await this.getApiProvider();
    
    switch (provider) {
      case 'deepseek':
        return await this.callDeepSeek(prompt);
      case 'openai':
        return await this.callOpenAI(prompt);
      case 'openrouter':
        return await this.callOpenRouter(prompt);
      default:
        throw new Error('Invalid AI provider');
    }
  }

  async callDeepSeek(prompt) {
    const apiKey = this.apiKeys.deepseek;
    if (!apiKey) throw new Error('DeepSeek API key not found');

    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful habit coach. Always respond in the requested format.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  }

  async callOpenAI(prompt) {
    const apiKey = this.apiKeys.openai;
    if (!apiKey) throw new Error('OpenAI API key not found');

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful habit coach. Always respond in the requested format.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  }

  async callOpenRouter(prompt) {
    const apiKey = this.apiKeys.openrouter;
    if (!apiKey) throw new Error('OpenRouter API key not found');

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful habit coach. Always respond in the requested format.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://habitowl-app.web.app',
        'X-Title': 'HabitOwl'
      }
    });

    return response.data.choices[0].message.content;
  }

  getFallbackSuggestions() {
    return [
      { name: "Morning Meditation", description: "5 minutes of mindfulness", category: "wellness", difficulty: 2, estimatedTime: "5 min" },
      { name: "Read 10 Pages", description: "Daily reading habit", category: "learning", difficulty: 2, estimatedTime: "15 min" },
      { name: "Drink Water", description: "Stay hydrated throughout the day", category: "health", difficulty: 1, estimatedTime: "1 min" },
      { name: "Evening Walk", description: "30-minute walk after dinner", category: "fitness", difficulty: 3, estimatedTime: "30 min" },
      { name: "Gratitude Journal", description: "Write 3 things you're grateful for", category: "wellness", difficulty: 2, estimatedTime: "5 min" }
    ];
  }

  getFallbackMotivationalMessage(habit, streak) {
    const messages = [
      `Amazing! ${streak} days strong with ${habit.name}! 🔥`,
      `You're crushing it! Day ${streak} of ${habit.name}! Keep going! 💪`,
      `${streak} days of consistency! You're building something great! 🌟`,
      `Day ${streak}! Your future self will thank you for ${habit.name}! 🚀`,
      `${streak} days in a row! You're proving habits can stick! 🎯`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

export default new AIService();