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

import PromoService from '../services/PromoService';
import FirebaseService from '../services/FirebaseService';

const PromoOfferBanner = ({ onUpgradePress, style = {} }) => {
  const [offer, setOffer] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [visible, setVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadActiveOffer();
  }, []);

  useEffect(() => {
    if (offer && offer.expiresAt) {
      const timer = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [offer]);

  useEffect(() => {
    if (visible && offer) {
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
    }
  }, [visible, offer]);

  const loadActiveOffer = async () => {
    try {
      console.log('PromoOfferBanner: Loading active offer...');
      
      // Get user stats for personalization
      const userStats = await FirebaseService.getUserStats();
      
      // Get personalized offer from PromoService
      const activeOffer = await PromoService.getPersonalizedOffer(userStats);
      
      if (activeOffer && activeOffer.title && activeOffer.description) {
        console.log('PromoOfferBanner: Loaded offer:', activeOffer.title);
        setOffer(activeOffer);
        setVisible(true);
        
        // Track impression
        FirebaseService.trackEvent('promo_offer_shown', {
          offer_id: activeOffer.id,
          offer_title: activeOffer.title,
          offer_type: activeOffer.type
        }).catch(() => {});
      } else {
        console.log('PromoOfferBanner: No active offers available');
        setVisible(false);
      }
    } catch (error) {
      console.log('PromoOfferBanner: Error loading offer:', error.message);
      setVisible(false);
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
      // Track click
      await PromoService.trackOfferClick(offer.id);
      
      FirebaseService.trackEvent('promo_offer_clicked', {
        offer_id: offer.id,
        offer_title: offer.title,
        offer_type: offer.type
      }).catch(() => {});

      // Show details
      Alert.alert(
        offer.title || 'Special Offer',
        `${offer.description || 'Limited time offer!'}\n\nDiscount: ${offer.discount || 'Special pricing'}\nValid for: ${timeLeft || 'Limited time'}`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade Now',
            onPress: async () => {
              // Track conversion
              await PromoService.trackOfferConversion(offer.id);
              
              FirebaseService.trackEvent('promo_offer_converted', {
                offer_id: offer.id,
                offer_title: offer.title,
                offer_type: offer.type
              }).catch(() => {});
              
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
      if (offer) {
        FirebaseService.trackEvent('promo_offer_dismissed', {
          offer_id: offer.id,
          offer_title: offer.title,
          offer_type: offer.type
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
      console.error('PromoOfferBanner: Error dismissing:', error);
      setVisible(false);
    }
  };

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

              <Text style={styles.title}>{offer.title}</Text>
              <Text style={styles.description}>{offer.description}</Text>

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
