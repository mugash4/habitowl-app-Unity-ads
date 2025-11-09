import React from 'react';
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

const AboutScreen = ({ navigation }) => {
  const handleOpenLink = (url) => {
    Linking.openURL(url);
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
              icon="email"
              onPress={() => handleOpenLink('mailto:support@habitowl.app')}
              style={styles.contactButton}
              contentStyle={styles.contactButtonContent}
            >
              Contact Support
            </Button>

            <Button
              mode="outlined"
              icon="web"
              onPress={() => handleOpenLink('https://habitowl-app.web.app')}
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
              onPress={() => handleOpenLink('https://habitowl-app.web.app/privacy')}
              style={styles.legalButton}
            >
              Privacy Policy
            </Button>
            
            <Button
              mode="text"
              onPress={() => handleOpenLink('https://habitowl-app.web.app/terms')}
              style={styles.legalButton}
            >
              Terms of Service
            </Button>
            
            <Button
              mode="text"
              onPress={() => handleOpenLink('https://habitowl-app.web.app/licenses')}
              style={styles.legalButton}
            >
              Open Source Licenses
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
