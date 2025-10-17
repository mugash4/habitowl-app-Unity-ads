import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated
} from 'react-native';
import {
  Card,
  Button,
  List,
  Chip,
  Appbar
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import FirebaseService from '../services/FirebaseService';
import AdService from '../services/AdService';

const PremiumScreen = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const plans = {
    monthly: {
      id: 'monthly',
      name: 'Monthly',
      price: '$4.99',
      period: '/month',
      savings: null,
      popular: false,
    },
    yearly: {
      id: 'yearly',
      name: 'Yearly',
      price: '$39.99',
      period: '/year',
      savings: 'Save 33%',
      popular: true,
    }
  };

  const features = [
    {
      icon: 'crown',
      title: 'Remove All Ads',
      description: 'Enjoy HabitOwl without any interruptions',
      premium: true
    },
    {
      icon: 'infinity',
      title: 'Unlimited Habits',
      description: 'Create as many habits as you need',
      premium: true
    },
    {
      icon: 'robot',
      title: 'Advanced AI Coaching',
      description: 'Get personalized insights and motivation',
      premium: true
    },
    {
      icon: 'chart-line',
      title: 'Detailed Analytics',
      description: 'Advanced progress tracking and reports',
      premium: true
    },
    {
      icon: 'account-group',
      title: 'Family Sharing',
      description: 'Share habits with family members',
      premium: true
    },
    {
      icon: 'cloud-sync',
      title: 'Cloud Backup',
      description: 'Never lose your progress across devices',
      premium: true
    },
    {
      icon: 'palette',
      title: 'Custom Themes',
      description: 'Personalize your app appearance',
      premium: true
    },
    {
      icon: 'email',
      title: 'Priority Support',
      description: '24/7 premium customer support',
      premium: true
    }
  ];

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      
      // In a real app, you would integrate with a payment processor like Stripe
      // For this demo, we'll simulate the subscription process
      
      Alert.alert(
        'Subscription Demo',
        `This would normally process a ${plans[selectedPlan].price} ${plans[selectedPlan].period} subscription. For this demo, we'll activate premium features.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Activate Demo Premium',
            onPress: async () => {
              try {
                // Update user's premium status
                await FirebaseService.updateUserStats({ isPremium: true });
                await AdService.setPremiumStatus(true);
                
                // Track the upgrade
                await FirebaseService.trackEvent('premium_upgrade', {
                  plan: selectedPlan,
                  price: plans[selectedPlan].price
                });
                
                Alert.alert(
                  'Welcome to Premium! 🎉',
                  'You now have access to all premium features. Enjoy your ad-free experience!',
                  [
                    {
                      text: 'Great!',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to activate premium features');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = () => {
    Alert.alert(
      'Restore Purchases',
      'This would restore any previous premium purchases from your app store account.',
      [{ text: 'OK' }]
    );
  };

  const renderPlanCard = (plan) => (
    <Card
      key={plan.id}
      style={[
        styles.planCard,
        selectedPlan === plan.id && styles.selectedPlan,
        plan.popular && styles.popularPlan
      ]}
      onPress={() => setSelectedPlan(plan.id)}
    >
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}
      
      <Card.Content style={styles.planContent}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planPeriod}>{plan.period}</Text>
        </View>
        {plan.savings && (
          <Chip style={styles.savingsChip} textStyle={styles.savingsText}>
            {plan.savings}
          </Chip>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Upgrade to Premium" />
      </Appbar.Header>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.header}>
            <Icon name="crown" size={60} color="#f59e0b" />
            <Text style={styles.headerTitle}>Unlock Premium Features</Text>
            <Text style={styles.headerSubtitle}>
              Take your habit building to the next level
            </Text>
          </LinearGradient>

          {/* Pricing Plans */}
          <View style={styles.plansContainer}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            <View style={styles.plansRow}>
              {Object.values(plans).map(renderPlanCard)}
            </View>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            
            {features.map((feature, index) => (
              <List.Item
                key={index}
                title={feature.title}
                description={feature.description}
                left={(props) => (
                  <View style={styles.featureIconContainer}>
                    <Icon 
                      name={feature.icon} 
                      size={24} 
                      color={feature.premium ? '#4f46e5' : '#6b7280'} 
                    />
                  </View>
                )}
                right={() => (
                  feature.premium ? (
                    <Icon name="crown" size={20} color="#f59e0b" />
                  ) : (
                    <Icon name="check" size={20} color="#10b981" />
                  )
                )}
                style={styles.featureItem}
              />
            ))}
          </View>

          {/* 7-Day Free Trial Notice */}
          <Card style={styles.trialCard}>
            <Card.Content>
              <View style={styles.trialHeader}>
                <Icon name="calendar-clock" size={24} color="#10b981" />
                <Text style={styles.trialTitle}>7-Day Free Trial</Text>
              </View>
              <Text style={styles.trialDescription}>
                Try all premium features risk-free for 7 days. Cancel anytime before your trial ends to avoid charges.
              </Text>
            </Card.Content>
          </Card>

          {/* Subscribe Button */}
          <View style={styles.subscribeContainer}>
            <Button
              mode="contained"
              onPress={handleSubscribe}
              loading={isLoading}
              disabled={isLoading}
              style={styles.subscribeButton}
              contentStyle={styles.subscribeButtonContent}
            >
              Start 7-Day Free Trial
            </Button>
            
            <Text style={styles.subscribeNote}>
              Then {plans[selectedPlan].price}{plans[selectedPlan].period}
            </Text>

            <Button
              mode="text"
              onPress={handleRestorePurchases}
              style={styles.restoreButton}
              labelStyle={styles.restoreButtonText}
            >
              Restore Purchases
            </Button>
          </View>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By subscribing, you agree to our Terms of Service and Privacy Policy. 
              Subscription automatically renews unless auto-renewal is turned off at 
              least 24 hours before the end of the current period.
            </Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
  },
  plansContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  plansRow: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlan: {
    borderColor: '#4f46e5',
  },
  popularPlan: {
    borderColor: '#f59e0b',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    backgroundColor: '#f59e0b',
    paddingVertical: 4,
    zIndex: 1,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  planContent: {
    alignItems: 'center',
    paddingTop: 20,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  planPeriod: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 2,
  },
  savingsChip: {
    backgroundColor: '#dcfce7',
  },
  savingsText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuresContainer: {
    padding: 20,
    paddingTop: 0,
  },
  featureItem: {
    paddingVertical: 8,
  },
  featureIconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
    marginLeft: 8,
  },
  trialDescription: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  subscribeContainer: {
    padding: 20,
    alignItems: 'center',
  },
  subscribeButton: {
    width: '100%',
    backgroundColor: '#4f46e5',
    marginBottom: 8,
  },
  subscribeButtonContent: {
    paddingVertical: 12,
  },
  subscribeNote: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  restoreButton: {
    marginTop: 8,
  },
  restoreButtonText: {
    color: '#4f46e5',
    fontSize: 14,
  },
  termsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
  bottomPadding: {
    height: 20,
  },
});

export default PremiumScreen;