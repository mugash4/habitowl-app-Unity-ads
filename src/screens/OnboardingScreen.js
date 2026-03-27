import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const onboardingSlides = [
  {
    id: 'welcome',
    icon: 'owl',
    title: 'Build habits that actually stick',
    description:
      'Create routines, stay consistent, and make daily progress without overthinking your schedule.',
    accent: ['#4f46e5', '#7c3aed'],
    points: ['Simple daily tracking', 'Clean progress view', 'Gentle reminders'],
  },
  {
    id: 'coach',
    icon: 'lightbulb-on-outline',
    title: 'Get smart coaching when you need it',
    description:
      'HabitOwl gives you motivation, streak awareness, and AI habit guidance so you keep moving forward.',
    accent: ['#7c3aed', '#a855f7'],
    points: ['2 free coaching uses daily', 'Premium unlocks unlimited coaching', 'Advice based on your progress'],
  },
  {
    id: 'results',
    icon: 'chart-line',
    title: 'See progress and stay motivated',
    description:
      'Track streaks, celebrate wins, and manage your habits in one focused space designed for momentum.',
    accent: ['#4338ca', '#4f46e5'],
    points: ['Track streaks', 'See completion trends', 'Upgrade anytime for the full experience'],
  },
];

const SlideGraphic = ({ icon, colors }) => {
  return (
    <View style={styles.graphicWrapper}>
      <LinearGradient colors={colors} style={styles.graphicGlow} />
      <View style={[styles.graphicRing, styles.graphicRingOuter]} />
      <View style={[styles.graphicRing, styles.graphicRingMiddle]} />
      <LinearGradient colors={colors} style={styles.graphicCore}>
        <Icon name={icon} size={68} color="#ffffff" />
      </LinearGradient>
      <View style={[styles.floatingBubble, styles.bubbleTopLeft]}>
        <Icon name="check-circle" size={20} color="#10b981" />
      </View>
      <View style={[styles.floatingBubble, styles.bubbleTopRight]}>
        <Icon name="fire" size={20} color="#f59e0b" />
      </View>
      <View style={[styles.floatingBubble, styles.bubbleBottom]}>
        <Icon name="star-four-points" size={20} color="#8b5cf6" />
      </View>
    </View>
  );
};

const OnboardingScreen = ({ onDone }) => {
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLastSlide = useMemo(
    () => currentIndex === onboardingSlides.length - 1,
    [currentIndex]
  );

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
  };

  const goToSlide = (index) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (isLastSlide) {
      onDone?.();
      return;
    }

    goToSlide(currentIndex + 1);
  };

  return (
    <LinearGradient colors={['#eef2ff', '#f8fafc']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#eef2ff" />

      <View style={styles.topRow}>
        <Text style={styles.brand}>HabitOwl</Text>
        {!isLastSlide ? (
          <TouchableOpacity onPress={onDone} activeOpacity={0.8}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipSpacer} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContent}
      >
        {onboardingSlides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <SlideGraphic icon={slide.icon} colors={slide.accent} />

            <View style={styles.textBlock}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>

            <View style={styles.pointsCard}>
              {slide.points.map((point) => (
                <View key={point} style={styles.pointRow}>
                  <Icon name="check-circle-outline" size={18} color="#4f46e5" />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {onboardingSlides.map((slide, index) => (
            <View
              key={slide.id}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleNext}
          contentStyle={styles.primaryButtonContent}
          style={styles.primaryButton}
          buttonColor="#4f46e5"
          icon={isLastSlide ? 'rocket-launch' : 'arrow-right'}
        >
          {isLastSlide ? 'Get Started' : 'Next'}
        </Button>

        <Text style={styles.footerNote}>
          By continuing, you accept HabitOwl&apos;s in-app experience and can start tracking habits right away.
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    paddingTop: 56,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#312e81',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  skipSpacer: {
    width: 40,
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  slide: {
    width,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'center',
  },
  graphicWrapper: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  graphicGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.14,
  },
  graphicRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.12)',
  },
  graphicRingOuter: {
    width: 250,
    height: 250,
  },
  graphicRingMiddle: {
    width: 210,
    height: 210,
  },
  graphicCore: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  floatingBubble: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  bubbleTopLeft: {
    top: 42,
    left: 52,
  },
  bubbleTopRight: {
    top: 78,
    right: 58,
  },
  bubbleBottom: {
    bottom: 54,
    left: '50%',
    marginLeft: -22,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 320,
  },
  pointsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pointText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: '#c7d2fe',
  },
  dotActive: {
    width: 28,
    backgroundColor: '#4f46e5',
  },
  primaryButton: {
    borderRadius: 16,
    marginBottom: 14,
  },
  primaryButtonContent: {
    height: 54,
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default OnboardingScreen;
