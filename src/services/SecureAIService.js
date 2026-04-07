import axios from 'axios';
import AdminService from './AdminService';
import FirebaseService from './FirebaseService';

class SecureAIService {
  constructor() {
    this.defaultProvider = 'deepseek';
    this.premiumProvider = 'openai';
    this.supportedProviders = ['deepseek', 'openai', 'openrouter'];
  }

  isSupportedProvider(provider) {
    return this.supportedProviders.includes(provider);
  }

  async getProviderCandidates(userIsPremium = false) {
    const candidates = [];

    try {
      const adminDefault = await AdminService.getDefaultAiProvider();
      if (this.isSupportedProvider(adminDefault)) {
        candidates.push(adminDefault);
      }
    } catch (error) {
      console.log(
        'SecureAIService: Could not load admin default provider:',
        error.message,
      );
    }

    if (userIsPremium && this.isSupportedProvider(this.premiumProvider)) {
      candidates.push(this.premiumProvider);
    }

    if (this.isSupportedProvider(this.defaultProvider)) {
      candidates.push(this.defaultProvider);
    }

    this.supportedProviders.forEach((provider) => candidates.push(provider));

    return [...new Set(candidates.filter(Boolean))];
  }

  normalizeApiKey(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  async resolveProviderAndKey(userIsPremium = false) {
    const candidates = await this.getProviderCandidates(userIsPremium);

    for (const provider of candidates) {
      try {
        const apiKey = this.normalizeApiKey(
          await AdminService.getGlobalApiKey(provider),
        );

        if (apiKey) {
          return { provider, apiKey };
        }
      } catch (error) {
        console.log(
          `SecureAIService: Could not load API key for ${provider}:`,
          error.message,
        );
      }
    }

    return {
      provider: candidates[0] || this.defaultProvider,
      apiKey: null,
    };
  }

  async getActiveProvider(userIsPremium = false) {
    try {
      const resolved = await this.resolveProviderAndKey(userIsPremium);
      return resolved.provider || this.defaultProvider;
    } catch (error) {
      console.error('Error getting active provider:', error);
      return this.defaultProvider;
    }
  }

  async generateHabitSuggestions(userProfile, currentHabits) {
    const prompt = `Based on this user profile and current habits, suggest 5 new helpful habits:
    
    User Profile: ${JSON.stringify(userProfile)}
    Current Habits: ${currentHabits.map((h) => h.name).join(', ')}
    
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
      return 'Your progress looks good! Keep maintaining consistency for better results.';
    }
  }

  async callSecureAI(prompt) {
    try {
      console.log('🤖 SecureAIService: Starting AI call...');

      const userStats = await FirebaseService.getUserStats();
      let isPremium = userStats?.isPremium || false;

      const user = FirebaseService.currentUser;
      if (user && user.email && !isPremium) {
        console.log('🔍 Checking admin status for:', user.email);
        const isAdmin = await AdminService.checkAdminStatus(user.email);
        if (isAdmin) {
          console.log('✅ Admin detected, granting premium access');
          isPremium = true;
        }
      }

      console.log('👤 User premium status:', isPremium);
      console.log('🔑 Resolving AI provider and key...');

      const { provider, apiKey } = await this.resolveProviderAndKey(isPremium);
      console.log('🔧 Using AI provider:', provider);

      if (!apiKey) {
        console.error('❌ No API key found for available providers');
        throw new Error(
          `API_KEY_MISSING: No API key configured for ${provider}. Please add at least one valid AI provider key in Admin Settings.`,
        );
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
      console.error('❌ AI Service Error:', error);

      if (error.message && error.message.includes('API_KEY_MISSING')) {
        throw new Error(
          'AI coaching is not configured yet. Please add a valid AI API key in Admin Panel → Configure API Keys.',
        );
      }

      throw error;
    }
  }

  async callDeepSeek(prompt, apiKey) {
    console.log('📡 Calling DeepSeek API...');

    try {
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                'You are HabitOwl AI, a helpful habit coach. Always respond in the requested format and be encouraging.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      console.log('✅ DeepSeek API response received');
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error(
        '❌ DeepSeek API error:',
        error.response?.data || error.message,
      );
      throw new Error(
        'DeepSeek API request failed. Please check API key and try again.',
      );
    }
  }

  async callOpenAI(prompt, apiKey) {
    console.log('📡 Calling OpenAI API...');

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are HabitOwl AI, a helpful habit coach. Always respond in the requested format and be encouraging.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      console.log('✅ OpenAI API response received');
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error(
        '❌ OpenAI API error:',
        error.response?.data || error.message,
      );
      throw new Error(
        'OpenAI API request failed. Please check API key and try again.',
      );
    }
  }

  async callOpenRouter(prompt, apiKey) {
    console.log('📡 Calling OpenRouter API...');

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are HabitOwl AI, a helpful habit coach. Always respond in the requested format and be encouraging.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://habitowl-app.web.app',
            'X-Title': 'HabitOwl',
          },
          timeout: 30000,
        },
      );

      console.log('✅ OpenRouter API response received');
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error(
        '❌ OpenRouter API error:',
        error.response?.data || error.message,
      );
      throw new Error(
        'OpenRouter API request failed. Please check API key and try again.',
      );
    }
  }

  getFallbackSuggestions() {
    return [
      {
        name: 'Morning Meditation',
        description: '5 minutes of mindfulness',
        category: 'wellness',
        difficulty: 2,
        estimatedTime: '5 min',
      },
      {
        name: 'Read 10 Pages',
        description: 'Daily reading habit',
        category: 'learning',
        difficulty: 2,
        estimatedTime: '15 min',
      },
      {
        name: 'Drink Water',
        description: 'Stay hydrated throughout the day',
        category: 'health',
        difficulty: 1,
        estimatedTime: '1 min',
      },
      {
        name: 'Evening Walk',
        description: '30-minute walk after dinner',
        category: 'fitness',
        difficulty: 3,
        estimatedTime: '30 min',
      },
      {
        name: 'Gratitude Journal',
        description: "Write 3 things you're grateful for",
        category: 'wellness',
        difficulty: 2,
        estimatedTime: '5 min',
      },
    ];
  }

  getFallbackMotivationalMessage(habit, streak) {
    const messages = [
      `Amazing! ${streak} days strong with ${habit.name}! 🔥`,
      `You're crushing it! Day ${streak} of ${habit.name}! Keep going! 💪`,
      `${streak} days of consistency! You're building something great! 🌟`,
      `Day ${streak}! Your future self will thank you for ${habit.name}! 🚀`,
      `${streak} days in a row! You're proving habits can stick! ✨`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  async setApiKey(provider, apiKey) {
    return await AdminService.setGlobalApiKey(provider, apiKey);
  }

  async setDefaultProvider(provider) {
    return await AdminService.setDefaultAiProvider(provider);
  }
}

export default new SecureAIService();
