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

// Safe service imports
let PromoService = null;
let FirebaseService = null;

try {
  const PromoServiceModule = require('../services/PromoService');
  PromoService = PromoServiceModule.default || PromoServiceModule;
  console.log('✅ PromoOfferBanner: PromoService loaded');
} catch (error) {
  console.log('⚠️ PromoOfferBanner: PromoService not available');
}

try {
  const FirebaseServiceModule = require('../services/FirebaseService');
  FirebaseService = FirebaseServiceModule.default || FirebaseServiceModule;
  console.log('✅ PromoOfferBanner: FirebaseService loaded');
} catch (error) {
  console.log('⚠️ PromoOfferBanner: FirebaseService not available');
}

/**
 * ✅ FIXED: Error boundary for safe rendering
 */
class PromoOfferBannerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    console.log('PromoOfferBanner error:', error.message);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PromoOfferBanner error:', error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Fail silently - banner is optional
    }
    return this.props.children;
  }
}

/**
 * ✅ FIXED: Promotional Offer Banner Component
 * Shows automated promotional offers for free users
 */
const PromoOfferBanner = ({ onUpgradePress, style = {} }) => {
  const [offer, setOffer] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slideAnim] = useState(new Animated.Value(-100));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    console.log('🎯 PromoOfferBanner: Component mounted');
    
    // Only load if services available
    if (!PromoService || !FirebaseService) {
      console.log('⚠️ PromoOfferBanner: Services not available - showing fallback banner');
      setLoading(false);
      // ✅ FIXED: Show fallback banner when services unavailable
      setOffer({
        id: 'fallback',
        title: '🎉 Special Offer!',
        description: 'Upgrade to Premium and unlock unlimited habits, AI coaching, and ad-free experience!',
        discount: '50% OFF',
        expiresAt: null
      });
      setVisible(true);
      return;
    }

    // ✅ FIXED: Load with better error handling
    loadActiveOfferOptimized();
  }, []);

  useEffect(() => {
    // Update countdown timer
    if (offer && offer.expiresAt && visible) {
      const timer = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [offer, visible]);

  useEffect(() => {
    // Animate entrance
    if (visible && offer) {
      try {
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
        console.log('Animation error:', error.message);
      }
    }
  }, [visible, offer]);

  /**
   * ✅ FIXED: Optimized offer loading with fallback
   */
  const loadActiveOfferOptimized = async () => {
    try {
      console.log('🔄 PromoOfferBanner: Loading offer...');
      setLoading(true);
      
      // ✅ FIXED: Shorter timeout (3 seconds) with guaranteed fallback
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => {
          console.log('⏱️ PromoOfferBanner: Timeout reached - using fallback');
          resolve({
            id: 'fallback',
            title: '🎉 Limited Time Offer!',
            description: 'Upgrade to Premium and unlock unlimited habits, AI coaching, and ad-free experience!',
            discount: '50% OFF',
            expiresAt: null
          });
        }, 3000) // 3 seconds timeout
      );

      const loadPromise = (async () => {
        try {
          // Get user stats with short timeout
          let userStats = null;
          try {
            const statsPromise = FirebaseService.getUserStats();
            const statsTimeout = new Promise((resolve) => 
              setTimeout(() => resolve(null), 1000)
            );
            userStats = await Promise.race([statsPromise, statsTimeout]);
          } catch (err) {
            console.log('Could not load user stats, continuing without them');
          }
          
          // Get active offer
          const activeOffer = await PromoService.getPersonalizedOffer(userStats);
          
          if (activeOffer && activeOffer.title) {
            return activeOffer;
          } else {
            // No active offer from service - return fallback
            return {
              id: 'fallback',
              title: '🎉 Special Offer!',
              description: 'Upgrade to Premium and unlock unlimited habits, AI coaching, and ad-free experience!',
              discount: '50% OFF',
              expiresAt: null
            };
          }
        } catch (err) {
          console.log('PromoService error:', err.message);
          // Error loading - return fallback
          return {
            id: 'fallback',
            title: '🎉 Upgrade to Premium!',
            description: 'Unlock unlimited habits, AI coaching, and ad-free experience!',
            discount: 'Special Pricing',
            expiresAt: null
          };
        }
      })();

      // ✅ FIXED: Always get an offer (either from service or fallback)
      const activeOffer = await Promise.race([loadPromise, timeoutPromise]);
      
      if (activeOffer && activeOffer.title) {
        console.log('✅ PromoOfferBanner: Offer loaded:', activeOffer.title);
        setOffer(activeOffer);
        setVisible(true);
        
        // Track impression
        if (FirebaseService && FirebaseService.trackEvent) {
          FirebaseService.trackEvent('promo_offer_shown', {
            offer_id: activeOffer.id,
            offer_title: activeOffer.title,
            screen: 'settings'
          }).catch(() => {});
        }
      } else {
        console.log('⚠️ PromoOfferBanner: No offer available');
        setVisible(false);
      }
    } catch (error) {
      console.log('⚠️ PromoOfferBanner: Load error:', error.message);
      
      // ✅ FIXED: Even on error, show fallback banner
      setOffer({
        id: 'fallback',
        title: '🎉 Upgrade to Premium!',
        description: 'Unlock unlimited habits, AI coaching, and ad-free experience!',
        discount: 'Special Pricing',
        expiresAt: null
      });
      setVisible(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update countdown timer
   */
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
      setTimeLeft('');
    }
  };

  /**
   * Handle offer click
   */
  const handleOfferClick = async () => {
    if (!offer) return;

    try {
      // Track click
      if (PromoService && PromoService.trackOfferClick) {
        PromoService.trackOfferClick(offer.id).catch(() => {});
      }
      
      if (FirebaseService && FirebaseService.trackEvent) {
        FirebaseService.trackEvent('promo_offer_clicked', {
          offer_id: offer.id,
          offer_title: offer.title
        }).catch(() => {});
      }

      // Show offer details
      const timeInfo = timeLeft ? `\n⏰ Valid for: ${timeLeft}` : '';
      Alert.alert(
        offer.title || 'Special Offer',
        `${offer.description || 'Limited time offer!'}\n\n💰 Discount: ${offer.discount || 'Special pricing'}${timeInfo}`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade Now',
            onPress: async () => {
              // Track conversion
              if (PromoService && PromoService.trackOfferConversion) {
                PromoService.trackOfferConversion(offer.id).catch(() => {});
              }
              
              if (FirebaseService && FirebaseService.trackEvent) {
                FirebaseService.trackEvent('promo_offer_converted', {
                  offer_id: offer.id,
                  offer_title: offer.title
                }).catch(() => {});
              }
              
              // Navigate to upgrade
              if (onUpgradePress && typeof onUpgradePress === 'function') {
                onUpgradePress();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('PromoOfferBanner click error:', error);
    }
  };

  /**
   * Handle dismiss
   */
  const handleDismiss = async () => {
    try {
      if (offer && FirebaseService && FirebaseService.trackEvent) {
        FirebaseService.trackEvent('promo_offer_dismissed', {
          offer_id: offer.id
        }).catch(() => {});
      }

      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    } catch (error) {
      console.error('Dismiss error:', error);
      setVisible(false);
    }
  };

  // ✅ FIXED: Show loading skeleton briefly (max 3 seconds due to timeout)
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Card style={styles.card}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading special offers...</Text>
          </View>
        </Card>
      </View>
    );
  }

  // Don't show if no offer or not visible
  if (!visible || !offer) {
    console.log('❌ PromoOfferBanner: Not rendering (visible:', visible, ', offer:', !!offer, ')');
    return null;
  }

  console.log('✅ PromoOfferBanner: Rendering banner with offer:', offer.title);

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
              {/* Dismiss button */}
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

                {/* Title */}
                <Text style={styles.title}>{offer.title}</Text>
                
                {/* Description */}
                <Text style={styles.description}>{offer.description}</Text>

                {/* Discount */}
                <View style={styles.discountContainer}>
                  <Text style={styles.discountText}>
                    {offer.discount || 'Special Pricing'}
                  </Text>
                </View>

                {/* Footer with timer and CTA */}
                <View style={styles.footer}>
                  {timeLeft && (
                    <View style={styles.timerContainer}>
                      <Icon name="clock-outline" size={16} color="#ffffff" />
                      <Text style={styles.timerText}>
                        Expires in: {timeLeft}
                      </Text>
                    </View>
                  )}

                  <Button
                    mode="contained"
                    onPress={handleOfferClick}
                    style={[styles.ctaButton, !timeLeft && styles.ctaButtonFull]}
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
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
  ctaButtonFull: {
    flex: 1,
  },
  ctaButtonText: {
    color: '#d97706',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default PromoOfferBanner;