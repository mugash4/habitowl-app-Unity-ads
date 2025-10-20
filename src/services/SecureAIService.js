import axios from 'axios';
import AdminService from './AdminService';
import FirebaseService from './FirebaseService';

class SecureAIService {
  constructor() {
    this.defaultProvider = 'deepseek'; // Default for free users
    this.premiumProvider = 'openai';   // Default for premium users
  }

  async getActiveProvider(userIsPremium = false) {
    try {
      // Premium users get ChatGPT by default, free users get DeepSeek
      const defaultProvider = userIsPremium ? this.premiumProvider : this.defaultProvider;
      
      // Admin can override default provider
      try {
        const adminDefault = await AdminService.getDefaultAiProvider();
        return adminDefault || defaultProvider;
      } catch (adminError) {
        console.error('Error getting admin default provider:', adminError);
        return defaultProvider;
      }
    } catch (error) {
      console.error('Error getting active provider:', error);
      // Always return a valid provider, never throw
      return userIsPremium ? this.premiumProvider : this.defaultProvider;
    }
  }

  async generateHabitSuggestions(userProfile, currentHabits) {
    const prompt = `Based on this user profile and current habits, suggest 5 new helpful habits:
    
    User Profile: ${JSON.stringify(userProfile)}
    Current Habits: ${currentHabits.map(h => h.name).join(', ')}
    
    Respond with a JSON array of objects with: name, description, category, difficulty (1-5), estimatedTime`;

    try {
      const response = await this.callSecureAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating habit suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  async generateMotivationalMessage(habit, streak, timeOfDay) {
    const prompt = `Generate a short, encouraging message for someone with a ${streak}-day streak on the habit: ${habit.name}. Time: ${timeOfDay}. Keep it under 50 words and make it motivational.`;

    try {
      const response = await this.callSecureAI(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error generating motivational message:', error);
      return this.getFallbackMotivationalMessage(habit, streak);
    }
  }

  async analyzeHabitProgress(habitData) {
    const prompt = `Analyze this habit progress data and provide insights:
    
    ${JSON.stringify(habitData)}
    
    Provide insights on: patterns, success rate, recommendations for improvement. Keep response under 200 words.`;

    try {
      const response = await this.callSecureAI(prompt);
      return response;
    } catch (error) {
      console.error('Error analyzing habit progress:', error);
      return "Your progress looks good! Keep maintaining consistency for better results.";
    }
  }

  async callSecureAI(prompt) {
    try {
      // Check if user is premium
      const userStats = await FirebaseService.getUserStats();
      const isPremium = userStats?.isPremium || false;
      
      // Get the appropriate provider
      const provider = await this.getActiveProvider(isPremium);
      
      // Get API key from secure admin config
      const apiKey = await AdminService.getGlobalApiKey(provider);
      
      if (!apiKey) {
        throw new Error(`No API key configured for ${provider}`);
      }

      switch (provider) {
        case 'deepseek':
          return await this.callDeepSeek(prompt, apiKey);
        case 'openai':
          return await this.callOpenAI(prompt, apiKey);
        case 'openrouter':
          return await this.callOpenRouter(prompt, apiKey);
        default:
          throw new Error('Invalid AI provider');
      }
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async callDeepSeek(prompt, apiKey) {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are HabitOwl AI, a helpful habit coach. Always respond in the requested format and be encouraging.' },
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

  async callOpenAI(prompt, apiKey) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are HabitOwl AI, a helpful habit coach. Always respond in the requested format and be encouraging.' },
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

  async callOpenRouter(prompt, apiKey) {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are HabitOwl AI, a helpful habit coach. Always respond in the requested format and be encouraging.' },
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
      `Amazing! ${streak} days strong with ${habit.name}! 🎉`,
      `You're crushing it! Day ${streak} of ${habit.name}! Keep going! 💪`,
      `${streak} days of consistency! You're building something great! 🌟`,
      `Day ${streak}! Your future self will thank you for ${habit.name}! 🚀`,
      `${streak} days in a row! You're proving habits can stick! 🔥`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Admin methods for API key management
  async setApiKey(provider, apiKey) {
    return await AdminService.setGlobalApiKey(provider, apiKey);
  }

  async setDefaultProvider(provider) {
    return await AdminService.setDefaultAiProvider(provider);
  }
}

export default new SecureAIService();
