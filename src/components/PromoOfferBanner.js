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
 * FIXED: Better "LIMITED TIME" text visibility
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
    
    // ✅ FIXED: Always show a fallback banner immediately for free users
    // This ensures something is always visible
    const fallbackOffer = {
      id: 'fallback',
      title: '🎉 Limited Time Offer!',
      description: 'Upgrade to Premium and unlock unlimited habits, AI coaching, and ad-free experience!',
      discount: '50% OFF',
      expiresAt: null
    };
    
    setOffer(fallbackOffer);
    setVisible(true);
    setLoading(false);
    
    // Try to load real offer in background (optional)
    if (PromoService && FirebaseService) {
      loadActiveOfferInBackground();
    } else {
      console.log('⚠️ PromoOfferBanner: Services not available - using fallback banner');
    }
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

        // Pulse animation for attention
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
   * ✅ FIXED: Load offer in background (non-blocking)
   */
  const loadActiveOfferInBackground = async () => {
    try {
      console.log('🔄 PromoOfferBanner: Loading offer in background...');
      
      // Short timeout - don't block UI
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => {
          console.log('⏱️ PromoOfferBanner: Timeout - keeping fallback');
          resolve(null);
        }, 2000)
      );

      const loadPromise = (async () => {
        try {
          let userStats = null;
          try {
            const statsPromise = FirebaseService.getUserStats();
            const statsTimeout = new Promise((resolve) => 
              setTimeout(() => resolve(null), 800)
            );
            userStats = await Promise.race([statsPromise, statsTimeout]);
          } catch (err) {
            console.log('Could not load user stats');
          }
          
          const activeOffer = await PromoService.getPersonalizedOffer(userStats);
          
          if (activeOffer && activeOffer.title) {
            return activeOffer;
          }
          return null;
        } catch (err) {
          console.log('PromoService error:', err.message);
          return null;
        }
      })();

      const activeOffer = await Promise.race([loadPromise, timeoutPromise]);
      
      // Only update if we got a real offer
      if (activeOffer && activeOffer.id !== 'fallback') {
        console.log('✅ PromoOfferBanner: Loaded real offer:', activeOffer.title);
        setOffer(activeOffer);
        
        // Track impression
        if (FirebaseService && FirebaseService.trackEvent) {
          FirebaseService.trackEvent('promo_offer_shown', {
            offer_id: activeOffer.id,
            offer_title: activeOffer.title,
            screen: 'settings'
          }).catch(() => {});
        }
      } else {
        console.log('ℹ️ PromoOfferBanner: Using fallback banner');
      }
    } catch (error) {
      console.log('⚠️ PromoOfferBanner: Background load error:', error.message);
      // Keep fallback banner
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

  // Don't show if not visible or no offer
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
                {/* Header with LIMITED TIME chip */}
                <View style={styles.header}>
                  <Icon name="fire" size={28} color="#ffffff" />
                  {/* ✅ FIXED: Much more visible "LIMITED TIME" chip */}
                  <View style={styles.urgencyChip}>
                    <Text style={styles.urgencyText}>LIMITED TIME</Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>{offer.title}</Text>
                
                {/* Description */}
                <Text style={styles.description}>{offer.description}</Text>

                {/* Discount Badge */}
                <View style={styles.discountContainer}>
                  <Text style={styles.discountText}>
                    {offer.discount || 'Special Pricing'}
                  </Text>
                </View>

                {/* Footer with timer and CTA */}
                <View style={styles.footer}>
                  {timeLeft && (
                    <View style={styles.timerContainer}>
                      <Icon name="clock-outline" size={18} color="#ffffff" />
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
                    compact={false}
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
  // ✅ FIXED: Much more visible urgency chip
  urgencyChip: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // ✅ FIXED: Larger, bolder text
  urgencyText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    fontSize: 15,
    color: '#fef3c7',
    marginBottom: 14,
    lineHeight: 22,
  },
  discountContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginBottom: 16,
    elevation: 2,
  },
  discountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
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
    marginRight: 12,
  },
  timerText: {
    fontSize: 13,
    color: '#fef3c7',
    marginLeft: 6,
    fontWeight: '600',
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    elevation: 4,
  },
  ctaButtonFull: {
    flex: 1,
  },
  ctaButtonText: {
    color: '#d97706',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 8,
  },
});

export default PromoOfferBanner;
