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

import AdminService from '../services/AdminService';
import FirebaseService from '../services/FirebaseService';

const PromoOfferBanner = ({ onUpgradePress, style = {} }) => {
  const [offer, setOffer] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [visible, setVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActiveOffer();
  }, []);

  useEffect(() => {
    if (offer) {
      const timer = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [offer]);

  useEffect(() => {
    if (visible) {
      // Slide in animation
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
    }
  }, [visible]);

  const loadActiveOffer = async () => {
    try {
      console.log('PromoOfferBanner: Starting offer load...');
      
      // CRITICAL FIX 1: Set loading timeout to 2 seconds MAX
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );
      
      // CRITICAL FIX 2: Wrap AdminService call in try-catch
      const offersPromise = (async () => {
        try {
          const result = await AdminService.getActivePromoOffers();
          return result;
        } catch (err) {
          console.log('AdminService error:', err);
          return [];
        }
      })();
      
      // Race between timeout and actual fetch
      const offers = await Promise.race([offersPromise, timeoutPromise]);
      
      console.log('PromoOfferBanner: Offers loaded:', offers?.length || 0);
      
      if (offers && Array.isArray(offers) && offers.length > 0) {
        const activeOffer = offers[0]; // Get the first active offer
        
        // Validate offer has required fields
        if (activeOffer.title && activeOffer.description) {
          setOffer(activeOffer);
          setVisible(true);
          
          // Track offer impression (fire and forget)
          FirebaseService.trackEvent('promo_offer_shown', {
            offer_id: activeOffer.id,
            offer_title: activeOffer.title
          }).catch(() => {});
        } else {
          console.log('PromoOfferBanner: Invalid offer data');
          setVisible(false);
        }
      } else {
        console.log('PromoOfferBanner: No active offers');
        setVisible(false);
      }
    } catch (error) {
      console.log('PromoOfferBanner: Error loading offers (gracefully handled):', error.message);
      // Gracefully fail - just don't show the banner
      setVisible(false);
      setOffer(null);
    } finally {
      // CRITICAL FIX 3: Always stop loading after attempt
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
      console.log('PromoOfferBanner: Error updating time:', error.message);
      setTimeLeft('');
    }
  };

  const handleOfferClick = async () => {
    if (!offer) return;

    try {
      // Track offer click (fire and forget)
      FirebaseService.trackEvent('promo_offer_clicked', {
        offer_id: offer.id,
        offer_title: offer.title
      }).catch(() => {});

      // Show offer details
      Alert.alert(
        offer.title || 'Special Offer',
        `${offer.description || 'Limited time offer!'}\n\nDiscount: ${offer.discount || 'Special pricing'}\nValid for: ${timeLeft || 'Limited time'}`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade Now',
            onPress: () => {
              FirebaseService.trackEvent('promo_offer_converted', {
                offer_id: offer.id,
                offer_title: offer.title
              }).catch(() => {});
              
              if (onUpgradePress && typeof onUpgradePress === 'function') {
                onUpgradePress();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('PromoOfferBanner: Error handling offer click:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      // Track dismissal (fire and forget)
      if (offer) {
        FirebaseService.trackEvent('promo_offer_dismissed', {
          offer_id: offer.id,
          offer_title: offer.title
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
      console.error('PromoOfferBanner: Error handling offer dismiss:', error);
      setVisible(false);
    }
  };

  // CRITICAL FIX 4: Return null immediately if loading failed or no offer
  if (isLoading && !visible) {
    // Still loading but not visible yet - show nothing to avoid blocking
    return null;
  }

  // Return null if not visible or no offer (prevents rendering empty space)
  if (!visible || !offer) {
    return null;
  }

  return (
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
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.dismissButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={20} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.content}>
              <View style={styles.header}>
                <Icon name="fire" size={24} color="#ffffff" />
                <Chip style={styles.urgencyChip} textStyle={styles.urgencyText}>
                  LIMITED TIME
                </Chip>
              </View>

              <Text style={styles.title}>{offer.title || 'Special Offer'}</Text>
              <Text style={styles.description}>
                {offer.description || 'Don\'t miss out on this amazing deal!'}
              </Text>

              <View style={styles.discountContainer}>
                <Text style={styles.discountText}>
                  {offer.discount || 'Special Pricing'}
                </Text>
              </View>

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
