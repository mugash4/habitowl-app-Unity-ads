import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Card, Button, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Safe service imports with fallbacks
let PromoService = null;
let FirebaseService = null;

try {
  const PromoServiceModule = require('../services/PromoService');
  PromoService = PromoServiceModule.default || PromoServiceModule;
} catch (error) {
  console.log('PromoOfferBanner: PromoService not available:', error.message);
}

try {
  const FirebaseServiceModule = require('../services/FirebaseService');
  FirebaseService = FirebaseServiceModule.default || FirebaseServiceModule;
} catch (error) {
  console.log('PromoOfferBanner: FirebaseService not available:', error.message);
}

// Error boundary component
class PromoOfferBannerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    console.log('PromoOfferBanner error boundary:', error.message);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PromoOfferBanner component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Fail silently - don't break the UI
    }
    return this.props.children;
  }
}

const PromoOfferBanner = ({ onUpgradePress, style = {} }) => {
  const [offer, setOffer] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [visible, setVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only load if services are available
    if (!PromoService || !FirebaseService) {
      console.log('PromoOfferBanner: Required services not available');
      setIsLoading(false);
      return;
    }

    loadActiveOffer();
  }, []);

  useEffect(() => {
    if (offer && offer.expiresAt && visible) {
      const timer = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [offer, visible]);

  useEffect(() => {
    if (visible && offer) {
      try {
        // Slide in animation
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();

        // Pulse animation
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );

        pulseAnimation.start();
        return () => pulseAnimation.stop();
      } catch (error) {
        console.log('PromoOfferBanner: Animation error:', error.message);
      }
    }
  }, [visible, offer]);

  const loadActiveOffer = async () => {
    try {
      console.log('PromoOfferBanner: Loading active offer...');
      
      // Add 5-second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout loading offer')), 5000)
      );

      const loadPromise = (async () => {
        // Get user stats (with fallback)
        let userStats = null;
        try {
          userStats = await FirebaseService.getUserStats();
        } catch (err) {
          console.log('PromoOfferBanner: Could not load user stats');
        }
        
        // Get personalized offer from PromoService
        const activeOffer = await PromoService.getPersonalizedOffer(userStats);
        return activeOffer;
      })();

      const activeOffer = await Promise.race([loadPromise, timeoutPromise]);
      
      if (activeOffer && activeOffer.title && activeOffer.description) {
        console.log('PromoOfferBanner: Loaded offer:', activeOffer.title);
        setOffer(activeOffer);
        setVisible(true);
        
        // Track impression (non-blocking)
        if (FirebaseService && FirebaseService.trackEvent) {
          FirebaseService.trackEvent('promo_offer_shown', {
            offer_id: activeOffer.id,
            offer_title: activeOffer.title,
            offer_type: activeOffer.type
          }).catch(() => {});
        }
      } else {
        console.log('PromoOfferBanner: No active offers available');
        setVisible(false);
      }
    } catch (error) {
      console.log('PromoOfferBanner: Error loading offer:', error.message);
      setVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeLeft = () => {
    if (!offer || !offer.expiresAt) {
      setTimeLeft('');
      return;
    }

    try {
      const now = new Date().getTime();
      const expiry = new Date(offer.expiresAt).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${minutes}m ${seconds}s`);
        }
      } else {
        setTimeLeft('Expired');
        setVisible(false);
      }
    } catch (error) {
      console.log('PromoOfferBanner: Error updating time');
      setTimeLeft('');
    }
  };

  const handleOfferClick = async () => {
    if (!offer) return;

    try {
      // Track click (non-blocking)
      if (PromoService && PromoService.trackOfferClick) {
        PromoService.trackOfferClick(offer.id).catch(() => {});
      }
      
      if (FirebaseService && FirebaseService.trackEvent) {
        FirebaseService.trackEvent('promo_offer_clicked', {
          offer_id: offer.id,
          offer_title: offer.title,
          offer_type: offer.type
        }).catch(() => {});
      }

      // Show details alert
      Alert.alert(
        offer.title || 'Special Offer',
        `${offer.description || 'Limited time offer!'}\n\nDiscount: ${offer.discount || 'Special pricing'}\nValid for: ${timeLeft || 'Limited time'}`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade Now',
            onPress: async () => {
              // Track conversion (non-blocking)
              if (PromoService && PromoService.trackOfferConversion) {
                PromoService.trackOfferConversion(offer.id).catch(() => {});
              }
              
              if (FirebaseService && FirebaseService.trackEvent) {
                FirebaseService.trackEvent('promo_offer_converted', {
                  offer_id: offer.id,
                  offer_title: offer.title,
                  offer_type: offer.type
                }).catch(() => {});
              }
              
              // Call upgrade callback
              if (onUpgradePress && typeof onUpgradePress === 'function') {
                onUpgradePress();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('PromoOfferBanner: Error handling click:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      // Track dismissal (non-blocking)
      if (offer && FirebaseService && FirebaseService.trackEvent) {
        FirebaseService.trackEvent('promo_offer_dismissed', {
          offer_id: offer.id,
          offer_title: offer.title,
          offer_type: offer.type
        }).catch(() => {});
      }

      // Slide out animation
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    } catch (error) {
      console.error('PromoOfferBanner: Error dismissing:', error);
      setVisible(false);
    }
  };

  // Don't render if loading, no offer, or not visible
  if (isLoading || !visible || !offer) {
    return null;
  }

  return (
    <PromoOfferBannerErrorBoundary>
      <Animated.View
        style={[
          styles.container,
          style,
          {
            transform: [
              { translateY: slideAnim },
              { scale: pulseAnim }
            ]
          }
        ]}
      >
        <TouchableOpacity onPress={handleOfferClick} activeOpacity={0.9}>
          <Card style={styles.card}>
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              {/* Close button */}
              <TouchableOpacity
                onPress={handleDismiss}
                style={styles.dismissButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={20} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                  <Icon name="fire" size={24} color="#ffffff" />
                  <Chip style={styles.urgencyChip} textStyle={styles.urgencyText}>
                    LIMITED TIME
                  </Chip>
                </View>

                {/* Title & Description */}
                <Text style={styles.title}>{offer.title}</Text>
                <Text style={styles.description}>{offer.description}</Text>

                {/* Discount badge */}
                <View style={styles.discountContainer}>
                  <Text style={styles.discountText}>
                    {offer.discount || 'Special Pricing'}
                  </Text>
                </View>

                {/* Footer with timer and CTA */}
                <View style={styles.footer}>
                  <View style={styles.timerContainer}>
                    <Icon name="clock-outline" size={16} color="#ffffff" />
                    <Text style={styles.timerText}>
                      Expires in: {timeLeft || 'Soon'}
                    </Text>
                  </View>

                  <Button
                    mode="contained"
                    onPress={handleOfferClick}
                    style={styles.ctaButton}
                    labelStyle={styles.ctaButtonText}
                    compact
                  >
                    Claim Now
                  </Button>
                </View>
              </View>
            </LinearGradient>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    </PromoOfferBannerErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginVertical: 8,
  },
  card: {
    elevation: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingRight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  urgencyChip: {
    backgroundColor: '#ef4444',
    height: 24,
  },
  urgencyText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#fef3c7',
    marginBottom: 12,
    lineHeight: 20,
  },
  discountContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  discountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timerText: {
    fontSize: 12,
    color: '#fef3c7',
    marginLeft: 4,
    fontWeight: '500',
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
  },
  ctaButtonText: {
    color: '#d97706',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default PromoOfferBanner;
