// AI-Powered Support Service for HabitOwl
// Automatically handles support tickets using AI understanding of the app

import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import axios from 'axios';

// App Knowledge Base - AI uses this to understand your app
const APP_KNOWLEDGE = {
  appName: "HabitOwl",
  version: "2.0",
  
  features: {
    free: [
      "Track up to 5 habits",
      "Basic habit tracking and completion",
      "View habit calendar",
      "Simple statistics",
      "Daily reminders",
      "Streak tracking"
    ],
    premium: [
      "Unlimited habits",
      "AI-powered habit coaching and suggestions",
      "Advanced analytics and insights",
      "No advertisements",
      "Custom habit categories",
      "Export data",
      "Priority support"
    ]
  },
  
  commonIssues: {
    login: "Users can login with Google Sign-In. If having issues, try: 1) Check internet connection, 2) Restart the app, 3) Clear app cache",
    premium: "Premium subscription costs $4.99/month. To upgrade: Go to Profile > Upgrade to Premium. Payments are processed securely through your app store.",
    habits: "Free users can create up to 5 habits. To create more habits, upgrade to Premium.",
    sync: "Data syncs automatically when you have internet connection. If not syncing: 1) Check internet, 2) Logout and login again",
    streaks: "Streaks count consecutive days you complete a habit. If streak is wrong, check your timezone settings.",
    notifications: "To enable notifications: Go to device Settings > Apps > HabitOwl > Enable Notifications",
    ads: "Ads support our free tier. Upgrade to Premium for ad-free experience.",
    data: "Your data is securely stored in Firebase. Premium users can export their data anytime."
  },
  
  pricing: {
    free: "$0 - 5 habits limit, with ads",
    premium: "$4.99/month - Unlimited habits, AI coaching, no ads"
  },
  
  support: {
    responseTime: "24-48 hours for free users, priority for premium",
    email: "Support through in-app contact form",
    refunds: "Contact app store for refund requests (Apple App Store or Google Play Store)"
  }
};

class AISupportService {
  constructor() {
    this.apiKey = null;
    this.initialized = false;
  }

  // Initialize AI service with API key from Firestore
  async initialize() {
    try {
      const configDoc = await getDoc(doc(db, 'admin_config', 'settings'));
      if (configDoc.exists()) {
        const apiKeys = configDoc.data().api_keys || {};
        this.apiKey = apiKeys.deepseek || apiKeys.openai;
        this.initialized = true;
        return true;
      }
      console.log('No API keys found in admin_config');
      return false;
    } catch (error) {
      console.error('Error initializing AI support:', error);
      return false;
    }
  }

  // Analyze ticket and generate AI response
  async analyzeTicket(ticketData) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.apiKey) {
      return {
        canAutoReply: false,
        reason: 'AI not configured',
        suggestedResponse: null,
        confidence: 0
      };
    }

    try {
      // Build context for AI
      const context = this.buildContext(ticketData);
      
      // Call AI API to analyze
      const aiResponse = await this.callAI(context, ticketData);
      
      return aiResponse;
    } catch (error) {
      console.error('Error analyzing ticket:', error);
      return {
        canAutoReply: false,
        reason: 'AI analysis failed',
        suggestedResponse: null,
        confidence: 0,
        error: error.message
      };
    }
  }

  // Build context for AI understanding
  buildContext(ticketData) {
    return `You are an AI support assistant for ${APP_KNOWLEDGE.appName}, a habit tracking app.

APP INFORMATION:
- Version: ${APP_KNOWLEDGE.version}
- Free Features: ${APP_KNOWLEDGE.features.free.join(', ')}
- Premium Features: ${APP_KNOWLEDGE.features.premium.join(', ')}
- Pricing: Free (5 habits limit) or Premium ($4.99/month, unlimited)

COMMON ISSUES & SOLUTIONS:
${Object.entries(APP_KNOWLEDGE.commonIssues).map(([key, solution]) => `- ${key}: ${solution}`).join('\n')}

USER TICKET:
Subject: ${ticketData.subject || 'No subject'}
Message: ${ticketData.message}
User Type: ${ticketData.isPremium ? 'Premium' : 'Free'}
User Email: ${ticketData.userEmail}

TASK:
1. Analyze if you can answer this question confidently (yes/no)
2. Provide confidence score (0-100)
3. If confident (score > 75), provide helpful response
4. If not confident, explain why and suggest human support

Respond in JSON format:
{
  "canAutoReply": boolean,
  "confidence": number (0-100),
  "response": "your helpful response here" or null,
  "reason": "why you can/cannot answer",
  "needsHuman": boolean,
  "category": "login|premium|habits|sync|streaks|notifications|ads|data|billing|other"
}`;
  }

  // Call AI API (DeepSeek or OpenAI)
  async callAI(context, ticketData) {
    try {
      // Try DeepSeek first (cheaper)
      if (this.apiKey.startsWith('sk-')) {
        // OpenAI format
        const response = await axios.post(
          'https://api.deepseek.com/v1/chat/completions',
          {
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'You are a helpful support assistant. Always respond in valid JSON format.' },
              { role: 'user', content: context }
            ],
            temperature: 0.3,
            max_tokens: 500
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const aiText = response.data.choices[0].message.content;
        const aiData = JSON.parse(aiText);
        
        return {
          canAutoReply: aiData.canAutoReply && aiData.confidence > 75,
          confidence: aiData.confidence,
          suggestedResponse: aiData.response,
          reason: aiData.reason,
          needsHuman: aiData.needsHuman || aiData.confidence <= 75,
          category: aiData.category || 'other'
        };
      }
    } catch (error) {
      console.error('AI API call failed:', error);
      return {
        canAutoReply: false,
        confidence: 0,
        suggestedResponse: null,
        reason: 'AI service unavailable',
        needsHuman: true,
        category: 'other'
      };
    }
  }

  // Process new ticket with AI
  async processTicket(ticketData) {
    const analysis = await this.analyzeTicket(ticketData);
    
    const processedTicket = {
      ...ticketData,
      aiAnalysis: analysis,
      status: analysis.canAutoReply ? 'auto_replied' : 'pending',
      handledBy: analysis.canAutoReply ? 'AI' : 'pending_human',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save ticket to Firestore
    const ticketRef = await addDoc(collection(db, 'support_tickets'), processedTicket);

    // If AI can auto-reply, send response immediately
    if (analysis.canAutoReply) {
      await this.sendAutoReply(ticketRef.id, analysis.suggestedResponse, ticketData.userEmail);
    }

    return {
      ticketId: ticketRef.id,
      status: processedTicket.status,
      autoReplied: analysis.canAutoReply,
      response: analysis.suggestedResponse
    };
  }

  // Send auto-reply to user
  async sendAutoReply(ticketId, response, userEmail) {
    try {
      // Add reply to ticket
      await addDoc(collection(db, 'support_tickets', ticketId, 'replies'), {
        message: response,
        sender: 'AI Assistant',
        isAI: true,
        timestamp: serverTimestamp()
      });

      // Update ticket status
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status: 'auto_replied',
        lastReply: serverTimestamp(),
        aiReplied: true
      });

      console.log(`Auto-reply sent for ticket ${ticketId}`);
      return true;
    } catch (error) {
      console.error('Error sending auto-reply:', error);
      return false;
    }
  }

  // Get ticket statistics
  async getStats() {
    try {
      const ticketsSnapshot = await getDocs(collection(db, 'support_tickets'));
      const tickets = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const stats = {
        total: tickets.length,
        autoReplied: tickets.filter(t => t.status === 'auto_replied').length,
        pendingHuman: tickets.filter(t => t.status === 'pending').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        autoReplyRate: 0,
        avgConfidence: 0
      };

      stats.autoReplyRate = stats.total > 0 ? (stats.autoReplied / stats.total * 100).toFixed(1) : 0;
      
      const confidenceScores = tickets
        .filter(t => t.aiAnalysis?.confidence)
        .map(t => t.aiAnalysis.confidence);
      
      stats.avgConfidence = confidenceScores.length > 0
        ? (confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length).toFixed(1)
        : 0;

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  // Get pending tickets (need human review)
  async getPendingTickets() {
    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting pending tickets:', error);
      return [];
    }
  }

  // Manual reply by human (marks ticket as resolved)
  async sendHumanReply(ticketId, response, adminEmail) {
    try {
      await addDoc(collection(db, 'support_tickets', ticketId, 'replies'), {
        message: response,
        sender: adminEmail,
        isAI: false,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status: 'resolved',
        handledBy: adminEmail,
        lastReply: serverTimestamp(),
        resolvedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error sending human reply:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new AISupportService();
