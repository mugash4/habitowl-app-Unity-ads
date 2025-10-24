import axios from 'axios';
import AdminService from './AdminService';
import FirebaseService from './FirebaseService';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

class AISupportService {
  constructor() {
    this.appKnowledge = `
# HabitOwl App - Complete Functionality Guide

## App Overview
HabitOwl is a smart habit tracking app with AI coaching, streak tracking, and premium features.

## Core Features:
1. **Habit Creation & Management**
   - Create unlimited habits (free users: 5 habits max, premium: unlimited)
   - Set custom names, descriptions, categories, icons, colors
   - Daily tracking with completion checkboxes
   - Edit, delete, or archive habits

2. **Streak Tracking**
   - Current streak counter (consecutive days)
   - Longest streak record
   - Completion calendar view
   - Daily completion tracking

3. **AI Coaching (Premium Feature)**
   - Personalized habit suggestions
   - Motivational messages
   - Progress analysis
   - Powered by DeepSeek (free) or ChatGPT (premium)

4. **Statistics & Analytics**
   - Completion rate charts
   - Weekly/monthly progress graphs
   - Habit performance comparisons
   - Best streak records

5. **User Accounts**
   - Email/password sign up
   - Google sign-in
   - Profile management
   - Password reset

6. **Premium Subscription ($4.99/month)**
   - Unlimited habits
   - Remove ads
   - AI coaching access
   - Advanced analytics
   - Priority support

7. **Referral System**
   - Unique referral codes for each user
   - Share with friends
   - Track referrals
   - Earn rewards

8. **Notifications**
   - Daily habit reminders
   - Streak notifications
   - Motivational push notifications
   - Customizable reminder times

9. **Settings & Support**
   - Account management
   - Notification preferences
   - Premium upgrade
   - Contact support
   - Privacy policy & terms

## Common Issues & Solutions:

### Habit Not Saving
- Check internet connection
- Make sure you're signed in
- Free users limited to 5 habits
- Try refreshing the app

### Streak Not Updating
- Complete habit before midnight
- Check timezone settings
- Refresh habit list
- Contact support if issue persists

### Premium Features Not Working
- Verify payment went through
- Sign out and sign back in
- Check subscription status in Settings
- Contact support for billing issues

### Login Problems
- Verify email/password correct
- Use "Forgot Password" for reset
- Try Google sign-in alternative
- Clear app cache and retry

### Notifications Not Working
- Enable notifications in Settings
- Check device notification permissions
- Ensure app has background refresh enabled
- Restart app after enabling

### Referral Code Not Working
- Code must be entered exactly as shown (case-sensitive)
- Can't use your own referral code
- Each code can only be used once per account
- Contact support if valid code doesn't work

## Technical Details:
- Built with React Native & Expo
- Firebase backend (Auth, Firestore, Storage)
- Node.js v20.18.0 required for development
- Web version available at habitowl-3405d.web.app
- Mobile apps for Android & iOS

## Support Contact:
- In-app: Settings > Contact Support
- Email: augustinemwathi96@gmail.com
- Response time: Within 24 hours
`;
  }

  /**
   * Main entry point: Handle support ticket with AI
   */
  async handleSupportTicket(ticketData) {
    try {
      // 1. Create ticket in Firestore
      const ticket = await this.createTicket(ticketData);

      // 2. Generate AI response
      const aiResponse = await this.generateAIResponse(ticketData);

      // 3. Determine if human escalation needed
      const needsHuman = this.needsHumanEscalation(ticketData, aiResponse);

      // 4. Update ticket with AI response
      await this.updateTicket(ticket.id, {
        aiResponse: aiResponse.answer,
        confidence: aiResponse.confidence,
        status: needsHuman ? 'escalated' : 'ai_resolved',
        resolvedBy: needsHuman ? null : 'ai',
        escalationReason: aiResponse.escalationReason || null,
        respondedAt: new Date().toISOString()
      });

      return {
        success: true,
        ticketId: ticket.id,
        aiResponse: aiResponse.answer,
        needsHuman: needsHuman,
        confidence: aiResponse.confidence
      };
    } catch (error) {
      console.error('Error handling support ticket:', error);
      throw error;
    }
  }

  /**
   * Create support ticket in Firestore
   */
  async createTicket(ticketData) {
    const user = FirebaseService.currentUser;
    
    const ticket = {
      userId: user?.uid || 'anonymous',
      userEmail: ticketData.userEmail || user?.email || 'no-email',
      userName: user?.displayName || 'User',
      issueType: ticketData.issueType || 'general',
      message: ticketData.message,
      status: 'new',
      createdAt: new Date().toISOString(),
      platform: ticketData.platform || 'mobile',
      appVersion: ticketData.appVersion || '2.9.0'
    };

    const docRef = await addDoc(collection(db, 'support_tickets'), ticket);
    
    return { id: docRef.id, ...ticket };
  }

  /**
   * Update ticket in Firestore
   */
  async updateTicket(ticketId, updates) {
    const ticketRef = doc(db, 'support_tickets', ticketId);
    await updateDoc(ticketRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Generate AI response using existing AI infrastructure
   */
  async generateAIResponse(ticketData) {
    try {
      // Get user stats for personalized response
      const userStats = await FirebaseService.getUserStats();
      const isPremium = userStats?.isPremium || false;

      // Build context-aware prompt
      const prompt = this.buildSupportPrompt(ticketData, userStats);

      // Call AI using existing infrastructure
      const aiAnswer = await this.callAIForSupport(prompt, isPremium);

      // Analyze confidence and escalation needs
      const analysis = this.analyzeResponse(ticketData, aiAnswer);

      return {
        answer: aiAnswer,
        confidence: analysis.confidence,
        escalationReason: analysis.escalationReason
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Fallback response
      return {
        answer: this.getFallbackResponse(ticketData.issueType),
        confidence: 0.3,
        escalationReason: 'AI service unavailable'
      };
    }
  }

  /**
   * Build comprehensive support prompt
   */
  buildSupportPrompt(ticketData, userStats) {
    return `You are HabitOwl Support AI. Provide helpful, friendly support.

APP KNOWLEDGE:
${this.appKnowledge}

USER INFO:
- Email: ${ticketData.userEmail}
- Premium: ${userStats?.isPremium ? 'Yes' : 'No'}
- Total Habits: ${userStats?.totalHabits || 0}
- Longest Streak: ${userStats?.longestStreak || 0}

ISSUE TYPE: ${ticketData.issueType}

USER MESSAGE:
${ticketData.message}

INSTRUCTIONS:
1. Provide a clear, helpful answer based on app knowledge
2. Be friendly and empathetic
3. Offer specific steps to resolve the issue
4. If issue requires billing/account access, say "I'll escalate this to our support team"
5. Keep response under 200 words
6. End with "Was this helpful? Reply if you need more assistance!"

YOUR RESPONSE:`;
  }

  /**
   * Call AI using existing infrastructure
   */
  async callAIForSupport(prompt, isPremium) {
    try {
      // Get provider (same as app's existing AI service)
      const provider = isPremium ? 'openai' : 'deepseek';
      const apiKey = await AdminService.getGlobalApiKey(provider);

      if (!apiKey) {
        throw new Error('No API key available');
      }

      // Use DeepSeek for cost-effective support
      if (provider === 'deepseek') {
        return await this.callDeepSeekSupport(prompt, apiKey);
      } else {
        return await this.callOpenAISupport(prompt, apiKey);
      }
    } catch (error) {
      console.error('AI call error:', error);
      throw error;
    }
  }

  /**
   * Call DeepSeek API for support
   */
  async callDeepSeekSupport(prompt, apiKey) {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are HabitOwl Support AI. Provide clear, helpful answers. Be concise and actionable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  /**
   * Call OpenAI API for support
   */
  async callOpenAISupport(prompt, apiKey) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are HabitOwl Support AI. Provide clear, helpful answers. Be concise and actionable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  /**
   * Analyze response confidence and escalation needs
   */
  analyzeResponse(ticketData, aiAnswer) {
    let confidence = 0.8; // Default high confidence
    let escalationReason = null;

    const message = ticketData.message.toLowerCase();
    const answer = aiAnswer.toLowerCase();

    // Billing/payment issues = always escalate
    if (
      message.includes('payment') ||
      message.includes('charge') ||
      message.includes('refund') ||
      message.includes('billing') ||
      message.includes('subscription')
    ) {
      confidence = 0.3;
      escalationReason = 'Billing/payment issue';
    }

    // Account access issues = escalate
    else if (
      message.includes('locked') ||
      message.includes('banned') ||
      message.includes('deleted account') ||
      message.includes('cant login')
    ) {
      confidence = 0.4;
      escalationReason = 'Account access issue';
    }

    // AI says to escalate
    else if (
      answer.includes('escalate') ||
      answer.includes('support team') ||
      answer.includes('human support')
    ) {
      confidence = 0.5;
      escalationReason = 'AI recommends human review';
    }

    // Bug reports with detailed info = medium confidence
    else if (ticketData.issueType === 'bug' && message.length > 200) {
      confidence = 0.6;
      escalationReason = 'Complex bug report';
    }

    return { confidence, escalationReason };
  }

  /**
   * Determine if human escalation needed
   */
  needsHumanEscalation(ticketData, aiResponse) {
    // Low confidence = needs human
    if (aiResponse.confidence < 0.6) {
      return true;
    }

    // Explicit escalation reason = needs human
    if (aiResponse.escalationReason) {
      return true;
    }

    // Premium users with urgent issues = prioritize
    const message = ticketData.message.toLowerCase();
    if (message.includes('urgent') || message.includes('emergency')) {
      return true;
    }

    return false;
  }

  /**
   * Fallback responses when AI unavailable
   */
  getFallbackResponse(issueType) {
    const fallbacks = {
      general: "Thanks for contacting HabitOwl support! I'm here to help. For general questions, check out our Help Center in Settings. Our team typically responds within 24 hours. Was this helpful?",
      
      bug: "Thanks for reporting this bug! Our team takes these seriously. Please include: 1) What you were doing, 2) What happened, 3) Your device type. We'll investigate and get back to you within 24 hours!",
      
      feature: "Great feature idea! We love hearing from users. All feature requests are reviewed by our product team. Keep the suggestions coming! Was this helpful?",
      
      account: "For account issues, please verify: 1) You're using the correct email, 2) Password is correct, 3) Try 'Forgot Password' reset. If still stuck, our support team will help within 24 hours!",
      
      billing: "For billing and subscription questions, please contact our support team directly. We'll review your account and respond within 24 hours. Thanks for your patience!",
      
      data: "For sync issues, try: 1) Check internet connection, 2) Sign out and sign back in, 3) Force quit and restart app. If problem persists, our team will investigate. Was this helpful?"
    };

    return fallbacks[issueType] || fallbacks.general;
  }

  /**
   * Get all tickets for admin review
   */
  async getEscalatedTickets() {
    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('status', '==', 'escalated'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching escalated tickets:', error);
      return [];
    }
  }

  /**
   * Get user's ticket history
   */
  async getUserTickets(userId) {
    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      return [];
    }
  }

  /**
   * Admin: Respond to escalated ticket
   */
  async respondToTicket(ticketId, humanResponse) {
    await this.updateTicket(ticketId, {
      humanResponse: humanResponse,
      status: 'resolved',
      resolvedBy: 'human',
      resolvedAt: new Date().toISOString()
    });
  }
}

export default new AISupportService();
