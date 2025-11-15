import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Image,
  Platform,
} from 'react-native';
import {
  Card,
  Button,
  List,
  Appbar
} from 'react-native-paper';
import { ScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ContactSupport from '../components/ContactSupport';
import FirebaseService from '../services/FirebaseService';
import adMobService from '../services/AdMobService'; 


const AboutScreen = ({ navigation }) => {
  const [showContactSupport, setShowContactSupport] = useState(false);

  // ✅ Track interactions for ads
  const [interactionCount, setInteractionCount] = useState(0);

  const trackInteractionAndShowAd = async (actionName) => {
    const newCount = interactionCount + 1;
    setInteractionCount(newCount);
  
    console.log(`[About] Interaction #${newCount}: ${actionName}`);
  
    // Show ad every 2 interactions in About screen
    if (newCount % 2 === 0) {
      setTimeout(async () => {
        try {
          await adMobService.showInterstitialAd(`about_${actionName}`);
        } catch (error) {
          console.log('[About] Ad not shown:', error);
        }
      }, 500);
    }
  };

  // ✅ FIXED: Updated to include ad tracking
  const handleOpenLink = (url) => {
    trackInteractionAndShowAd('link_press');
    Linking.openURL(url);
  };

  // ✅ FIXED: Updated to include ad tracking
  const handleContactSupport = () => {
    trackInteractionAndShowAd('contact_support');
    console.log('Opening support chat...');
    setShowContactSupport(true);
  
    FirebaseService.trackEvent('support_chat_opened', {
      from_screen: 'about'
    }).catch(err => console.log('Analytics tracking failed:', err));
  };

  const features = [
    {
      icon: 'target',
      title: 'Smart Habit Tracking',
      description: 'Effortlessly track your daily habits with intelligent reminders and progress insights.'
    },
    {
      icon: 'robot',
      title: 'AI-Powered Coaching',
      description: 'Get personalized habit suggestions and motivational messages powered by advanced AI.'
    },
    {
      icon: 'chart-line',
      title: 'Detailed Analytics',
      description: 'Visualize your progress with comprehensive charts and statistics.'
    },
    {
      icon: 'bell',
      title: 'Smart Reminders',
      description: 'Customizable notifications that adapt to your schedule and preferences.'
    },
    {
      icon: 'account-group',
      title: 'Social Features',
      description: 'Share your progress and compete with friends to stay motivated.'
    },
    {
      icon: 'cloud-sync',
      title: 'Cloud Sync',
      description: 'Your data is safely synced across all your devices automatically.'
    }
  ];

  const team = [
    {
      name: 'Development Team',
      role: 'Full-Stack Development',
      description: 'Passionate developers committed to building tools that improve lives.'
    },
    {
      name: 'AI Research Team',
      role: 'Machine Learning & AI',
      description: 'Experts in behavioral psychology and machine learning algorithms.'
    },
    {
      name: 'Design Team',
      role: 'User Experience',
      description: 'Creating intuitive and delightful user experiences.'
    }
  ];

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="About HabitOwl" />
      </Appbar.Header>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps='handled'
      >
        {/* App Header */}
        <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.header}>
          <View style={styles.logoImageContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logoImageLarge}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>HabitOwl</Text>
          <Text style={styles.version}>Version 2.9.0</Text>
          <Text style={styles.tagline}>
            Your intelligent companion for building better habits
          </Text>
        </LinearGradient>

        {/* Mission Statement */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.missionText}>
              At HabitOwl, we believe that small, consistent actions lead to extraordinary transformations. 
              Our mission is to empower individuals to build sustainable habits through intelligent technology, 
              personalized guidance, and a supportive community.
            </Text>
            <Text style={styles.missionText}>
              We combine cutting-edge AI with behavioral science to create an app that doesn't just track 
              your habits—it understands them, learns from them, and helps you optimize them for lasting change.
            </Text>
          </Card.Content>
        </Card>

        {/* Key Features */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Key Features</Text>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureHeader}>
                  <Icon name={feature.icon} size={24} color="#4f46e5" />
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                </View>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* ✅ NEW: Third-Party Services Disclosure */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.disclosureHeader}>
              <Icon name="information" size={24} color="#4f46e5" />
              <Text style={styles.sectionTitle}>Third-Party Services</Text>
            </View>
            
            <View style={styles.serviceItem}>
              <View style={styles.serviceIconContainer}>
                <Icon name="google-ads" size={20} color="#34A853" />
              </View>
              <View style={styles.serviceContent}>
                <Text style={styles.serviceName}>Google AdMob</Text>
                <Text style={styles.serviceDescription}>
                  This app uses Google AdMob for displaying advertisements. 
                  AdMob may collect device information and usage data for personalized advertising.
                </Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => handleOpenLink('https://policies.google.com/privacy')}
                  style={styles.privacyButton}
                  labelStyle={styles.privacyButtonLabel}
                >
                  View AdMob Privacy Policy →
                </Button>
              </View>
            </View>

            <View style={styles.serviceItem}>
              <View style={styles.serviceIconContainer}>
                <Icon name="robot" size={20} color="#4f46e5" />
              </View>
              <View style={styles.serviceContent}>
                <Text style={styles.serviceName}>AI Services</Text>
                <Text style={styles.serviceDescription}>
                  AI features are powered by multiple providers including:
                </Text>
                <View style={styles.aiProvidersList}>
                  <Text style={styles.aiProvider}>• DeepSeek AI (China-based)</Text>
                  <Text style={styles.aiProvider}>• OpenAI / ChatGPT</Text>
                  <Text style={styles.aiProvider}>• OpenRouter</Text>
                </View>
                <Text style={styles.serviceWarning}>
                  ⚠️ When you use AI coaching, your prompts and habit data are sent to these AI service providers.
                </Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => handleOpenLink('https://habitowl-3405d.web.app/privacy')}
                  style={styles.privacyButton}
                  labelStyle={styles.privacyButtonLabel}
                >
                  Read Full Privacy Policy →
                </Button>
              </View>
            </View>

            <View style={styles.optOutBox}>
              <Icon name="shield-check" size={20} color="#10b981" />
              <View style={styles.optOutContent}>
                <Text style={styles.optOutTitle}>Your Privacy Choices</Text>
                <Text style={styles.optOutText}>
                  • Opt out of personalized ads in your device settings
                  {'\n'}• AI features are optional - don't use them to avoid AI data processing
                  {'\n'}• Upgrade to Premium to remove all advertisements
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Technology Stack */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Built With</Text>
            <View style={styles.techGrid}>
              <View style={styles.techItem}>
                <Icon name="react" size={32} color="#61dafb" />
                <Text style={styles.techLabel}>React Native</Text>
              </View>
              <View style={styles.techItem}>
                <Icon name="firebase" size={32} color="#ff6f00" />
                <Text style={styles.techLabel}>Firebase</Text>
              </View>
              <View style={styles.techItem}>
                <Icon name="robot" size={32} color="#4f46e5" />
                <Text style={styles.techLabel}>AI/ML</Text>
              </View>
              <View style={styles.techItem}>
                <Icon name="chart-line" size={32} color="#10b981" />
                <Text style={styles.techLabel}>Analytics</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Team */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Our Team</Text>
            {team.map((member, index) => (
              <View key={index} style={styles.teamMember}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
                <Text style={styles.memberDescription}>{member.description}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Contact & Links */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Get In Touch</Text>
            
            <Button
              mode="outlined"
              icon="message-text"
              onPress={handleContactSupport}
              style={styles.contactButton}
              contentStyle={styles.contactButtonContent}
            >
              Contact Support
            </Button>

            <Button
              mode="outlined"
              icon="web"
              onPress={() => handleOpenLink('https://habitowl-3405d.web.app/')}
              style={styles.contactButton}
              contentStyle={styles.contactButtonContent}
            >
              Visit Website
            </Button>

            <Button
              mode="outlined"
              icon="twitter"
              onPress={() => handleOpenLink('https://twitter.com/habitowl')}
              style={styles.contactButton}
              contentStyle={styles.contactButtonContent}
            >
              Follow on Twitter
            </Button>
          </Card.Content>
        </Card>

        {/* App Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>App Information</Text>
            
            <List.Item
              title="Version"
              description="2.9.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
            
            <List.Item
              title="Build"
              description="Production"
              left={(props) => <List.Icon {...props} icon="hammer" />}
            />
            
            <List.Item
              title="Last Updated"
              description="November 2025"
              left={(props) => <List.Icon {...props} icon="calendar" />}
            />
            
            <List.Item
              title="Platform"
              description="iOS & Android"
              left={(props) => <List.Icon {...props} icon="cellphone" />}
            />
          </Card.Content>
        </Card>

        {/* Legal */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Legal</Text>
            
            <Button
              mode="text"
              onPress={() => handleOpenLink('https://habitowl-3405d.web.app/privacy')}
              style={styles.legalButton}
            >
              Privacy Policy
            </Button>
            
            <Button
              mode="text"
              onPress={() => handleOpenLink('https://habitowl-3405d.web.app/terms')}
              style={styles.legalButton}
            >
              Terms of Service
            </Button>
          </Card.Content>
        </Card>

        {/* Copyright */}
        <View style={styles.copyright}>
          <Text style={styles.copyrightText}>
            © 2025 HabitOwl. All rights reserved.
          </Text>
          <Text style={styles.copyrightText}>
            Made with ❤️ for habit builders everywhere
          </Text>
        </View>
      </ScrollView>

      {/* Contact Support Dialog */}
      <ContactSupport 
        visible={showContactSupport} 
        onDismiss={() => setShowContactSupport(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 30,
  },
  logoImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  logoImageLarge: {
    width: 90,
    height: 90,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  version: {
    fontSize: 16,
    color: '#e0e7ff',
    marginTop: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    marginTop: 12,
  },
  card: {
    margin: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  missionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
  },
  featureItem: {
    marginBottom: 20,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginLeft: 36,
  },
  // ✅ NEW: Disclosure Styles
  disclosureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  aiProvidersList: {
    marginLeft: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  aiProvider: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  serviceWarning: {
    fontSize: 13,
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  privacyButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  privacyButtonLabel: {
    fontSize: 13,
    color: '#4f46e5',
  },
  optOutBox: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
    marginTop: 8,
  },
  optOutContent: {
    flex: 1,
    marginLeft: 12,
  },
  optOutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 6,
  },
  optOutText: {
    fontSize: 13,
    color: '#065f46',
    lineHeight: 20,
  },
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'space-around',
  },
  techItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  techLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  teamMember: {
    marginBottom: 20,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: '#4f46e5',
    marginBottom: 6,
  },
  memberDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  contactButton: {
    marginBottom: 12,
  },
  contactButtonContent: {
    paddingVertical: 4,
  },
  legalButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  copyright: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  copyrightText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default AboutScreen;
