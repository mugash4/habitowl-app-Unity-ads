import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Platform
} from 'react-native';
import {
  Card,
  Button,
  List,
  Chip,
  Appbar,
  ActivityIndicator
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import FirebaseService from '../services/FirebaseService';
import SubscriptionService from '../services/SubscriptionService';

const PremiumScreen = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    initializeSubscriptions();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const initializeSubscriptions = async () => {
    try {
      setIsLoading(true);
      
      // Initialize IAP
      const initialized = await SubscriptionService.initialize();
      
      if (!initialized) {
        Alert.alert(
          'Store Unavailable',
          'Unable to connect to the app store. Please try again later.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Get available subscriptions
      const products = await SubscriptionService.getSubscriptions();
      console.log('Loaded products:', products);
      
      setSubscriptions(products);
    } catch (error) {
      console.error('Error initializing subscriptions:', error);
      Alert.alert(
        'Error',
        'Failed to load subscription options. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Map product IDs to plan types
  const getProductForPlan = (planType) => {
    if (subscriptions.length === 0) return null;
    
    const productId = planType === 'monthly' 
      ? (Platform.OS === 'android' ? 'habitowl_premium_monthly' : 'com.habitowl.app.monthly')
      : (Platform.OS === 'android' ? 'habitowl_premium_yearly' : 'com.habitowl.app.yearly');
    
    return subscriptions.find(sub => sub.productId === productId);
  };

  const plans = {
    monthly: {
      id: 'monthly',
      name: 'Monthly',
      productId: Platform.OS === 'android' ? 'habitowl_premium_monthly' : 'com.habitowl.app.monthly',
      price: getProductForPlan('monthly')?.localizedPrice || '$4.99',
      period: '/month',
      savings: null,
      popular: false,
      trial: '7-day free trial'
    },
    yearly: {
      id: 'yearly',
      name: 'Yearly',
      productId: Platform.OS === 'android' ? 'habitowl_premium_yearly' : 'com.habitowl.app.yearly',
      price: getProductForPlan('yearly')?.localizedPrice || '$39.99',
      period: '/year',
      savings: 'Save 33%',
      popular: true,
      trial: '7-day free trial'
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
      description: 'Create as many habits as you need (Free: 5 habits)',
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
      icon: 'cloud-sync',
      title: 'Cloud Backup',
      description: 'Never lose your progress across devices',
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
      setIsPurchasing(true);
      
      const selectedProductId = plans[selectedPlan].productId;
      console.log('Purchasing:', selectedProductId);
      
      // Request purchase
      const success = await SubscriptionService.purchaseSubscription(selectedProductId);
      
      if (success) {
        // Purchase was successful (or is being processed)
        Alert.alert(
          ' Welcome to Premium!',
          'Your 7-day free trial has started! You can cancel anytime before the trial ends.',
          [
            {
              text: 'Great!',
              onPress: () => {
                // Reload user stats to reflect premium status
                FirebaseService.getUserStats().then(() => {
                  navigation.goBack();
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
      
      if (error.message && !error.message.includes('E_USER_CANCELLED')) {
        Alert.alert(
          'Purchase Failed',
          'Unable to complete the purchase. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsPurchasing(true);
      await SubscriptionService.restorePurchases();
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const renderPlanCard = (plan) => {
    const product = getProductForPlan(plan.id);
    const actualPrice = product?.localizedPrice || plan.price;
    
    return (
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
          
          {/* 7-Day Trial Badge */}
          <View style={styles.trialBadgeSmall}>
            <Icon name="gift" size={14} color="#10b981" />
            <Text style={styles.trialBadgeText}>{plan.trial}</Text>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.planPrice}>{actualPrice}</Text>
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
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Upgrade to Premium" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Upgrade to Premium" />
      </Appbar.Header>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.header}>
            <Icon name="crown" size={60} color="#f59e0b" />
            <Text style={styles.headerTitle}>Unlock Premium Features</Text>
            <Text style={styles.headerSubtitle}>
              Start with a 7-day free trial
            </Text>
          </LinearGradient>

          {/* 7-Day Free Trial Highlight - PROMINENT */}
          <Card style={styles.trialHighlight}>
            <Card.Content>
              <View style={styles.trialHighlightHeader}>
                <Icon name="star" size={32} color="#f59e0b" />
                <View style={styles.trialHighlightTextContainer}>
                  <Text style={styles.trialHighlightTitle}>7-Day Free Trial</Text>
                  <Text style={styles.trialHighlightSubtitle}>
                    Try all premium features risk-free
                  </Text>
                </View>
              </View>
              <Text style={styles.trialHighlightDescription}>
                 Cancel anytime during trial{'\n'}
                 No charges until trial ends{'\n'}
                 Full access to all premium features{'\n'}
                 Manage subscription in Google Play Store
              </Text>
            </Card.Content>
          </Card>

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

          {/* Subscribe Button */}
          <View style={styles.subscribeContainer}>
            <Button
              mode="contained"
              onPress={handleSubscribe}
              loading={isPurchasing}
              disabled={isPurchasing || subscriptions.length === 0}
              style={styles.subscribeButton}
              contentStyle={styles.subscribeButtonContent}
            >
              {isPurchasing ? 'Processing...' : 'Start 7-Day Free Trial'}
            </Button>
            
            <Text style={styles.subscribeNote}>
              Then {plans[selectedPlan].price}{plans[selectedPlan].period}. Cancel anytime.
            </Text>

            <Button
              mode="text"
              onPress={handleRestorePurchases}
              style={styles.restoreButton}
              labelStyle={styles.restoreButtonText}
              disabled={isPurchasing}
            >
              Restore Purchases
            </Button>
          </View>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By subscribing, you agree to our Terms of Service and Privacy Policy. 
              Payment will be charged to your Google Play account after the 7-day free trial. 
              Subscription automatically renews unless auto-renewal is turned off at 
              least 24 hours before the end of the current period.
            </Text>
          </View>

          <View style={styles.bottomPadding} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
    fontSize: 18,
    color: '#e0e7ff',
    textAlign: 'center',
    fontWeight: '600',
  },
  trialHighlight: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 2,
    borderColor: '#f59e0b',
    elevation: 4,
  },
  trialHighlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trialHighlightTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  trialHighlightTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400e',
  },
  trialHighlightSubtitle: {
    fontSize: 14,
    color: '#b45309',
    marginTop: 2,
  },
  trialHighlightDescription: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 22,
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
    marginBottom: 4,
  },
  trialBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  trialBadgeText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: 'bold',
    marginLeft: 4,
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
    textAlign: 'center',
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
