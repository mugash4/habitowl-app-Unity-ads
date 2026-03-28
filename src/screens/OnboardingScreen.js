import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const habitOwlLogo = require('../../assets/icon.png');

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

const SlideGraphic = ({ slide, colors, heroSize, compactMode }) => {
  const shellSize = heroSize + (compactMode ? 34 : 46);
  const bubbleSize = compactMode ? 40 : 44;
  const badgeIconSize = compactMode ? 18 : 20;

  if (slide.id === 'welcome') {
    return (
      <View style={[styles.graphicWrapper, { height: compactMode ? 234 : 286 }]}>
        <LinearGradient
          colors={colors}
          style={[
            styles.logoGlow,
            {
              width: shellSize + 50,
              height: shellSize + 50,
              borderRadius: (shellSize + 50) / 2,
            },
          ]}
        />

        <View
          style={[
            styles.logoHalo,
            {
              width: shellSize + 22,
              height: shellSize + 22,
              borderRadius: (shellSize + 22) / 2,
            },
          ]}
        />

        <View
          style={[
            styles.logoFrame,
            {
              width: shellSize,
              height: shellSize,
              borderRadius: shellSize / 2,
            },
          ]}
        >
          <Image
            source={habitOwlLogo}
            style={{ width: heroSize, height: heroSize, borderRadius: heroSize * 0.24 }}
            resizeMode="contain"
          />
        </View>

        <View
          style={[
            styles.floatingBubble,
            styles.bubbleTopLeft,
            {
              width: bubbleSize,
              height: bubbleSize,
              borderRadius: bubbleSize / 2,
            },
          ]}
        >
          <Icon name="check-circle" size={badgeIconSize} color="#10b981" />
        </View>

        <View
          style={[
            styles.floatingBubble,
            styles.bubbleTopRight,
            {
              width: bubbleSize,
              height: bubbleSize,
              borderRadius: bubbleSize / 2,
            },
          ]}
        >
          <Icon name="star-four-points" size={badgeIconSize} color="#8b5cf6" />
        </View>

        <View
          style={[
            styles.floatingBubble,
            styles.bubbleBottom,
            {
              width: bubbleSize,
              height: bubbleSize,
              borderRadius: bubbleSize / 2,
              marginLeft: -(bubbleSize / 2),
            },
          ]}
        >
          <Icon name="fire" size={badgeIconSize} color="#f59e0b" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.graphicWrapper, { height: compactMode ? 234 : 286 }]}>
      <LinearGradient
        colors={colors}
        style={[
          styles.graphicGlow,
          {
            width: shellSize + 30,
            height: shellSize + 30,
            borderRadius: (shellSize + 30) / 2,
          },
        ]}
      />
      <View
        style={[
          styles.graphicRing,
          styles.graphicRingOuter,
          {
            width: shellSize + 36,
            height: shellSize + 36,
            borderRadius: (shellSize + 36) / 2,
          },
        ]}
      />
      <View
        style={[
          styles.graphicRing,
          styles.graphicRingMiddle,
          {
            width: shellSize,
            height: shellSize,
            borderRadius: shellSize / 2,
          },
        ]}
      />
      <LinearGradient
        colors={colors}
        style={[
          styles.graphicCore,
          {
            width: heroSize,
            height: heroSize,
            borderRadius: heroSize / 2,
          },
        ]}
      >
        <Icon name={slide.icon} size={compactMode ? 60 : 68} color="#ffffff" />
      </LinearGradient>
      <View
        style={[
          styles.floatingBubble,
          styles.bubbleTopLeft,
          {
            width: bubbleSize,
            height: bubbleSize,
            borderRadius: bubbleSize / 2,
          },
        ]}
      >
        <Icon name="check-circle" size={badgeIconSize} color="#10b981" />
      </View>
      <View
        style={[
          styles.floatingBubble,
          styles.bubbleTopRight,
          {
            width: bubbleSize,
            height: bubbleSize,
            borderRadius: bubbleSize / 2,
          },
        ]}
      >
        <Icon name="fire" size={badgeIconSize} color="#f59e0b" />
      </View>
      <View
        style={[
          styles.floatingBubble,
          styles.bubbleBottom,
          {
            width: bubbleSize,
            height: bubbleSize,
            borderRadius: bubbleSize / 2,
            marginLeft: -(bubbleSize / 2),
          },
        ]}
      >
        <Icon name="star-four-points" size={badgeIconSize} color="#8b5cf6" />
      </View>
    </View>
  );
};

const OnboardingScreen = ({ onDone }) => {
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const compactMode = height < 760;
  const veryCompactMode = height < 700;
  const heroSize = veryCompactMode ? 112 : compactMode ? 128 : 150;
  const titleSize = veryCompactMode ? 26 : compactMode ? 28 : 30;
  const titleLineHeight = veryCompactMode ? 34 : compactMode ? 36 : 38;
  const descriptionSize = compactMode ? 15 : 16;
  const descriptionLineHeight = compactMode ? 23 : 25;

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

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={[styles.topRow, { paddingTop: 6, minHeight: 56 }]}>
          <View style={styles.brandSlot}>
            {currentIndex === 0 ? (
              <Image source={habitOwlLogo} style={styles.headerLogo} resizeMode="contain" />
            ) : (
              <View style={styles.headerLogoSpacer} />
            )}
          </View>

          {!isLastSlide ? (
            <TouchableOpacity onPress={onDone} activeOpacity={0.8} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipSpacer} />
          )}
        </View>

        <View style={styles.carouselArea}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            contentContainerStyle={styles.scrollContent}
            style={styles.horizontalPager}
          >
            {onboardingSlides.map((slide) => (
              <View key={slide.id} style={[styles.slide, { width }]}>
                <ScrollView
                  bounces={false}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.slideScrollContent,
                    { paddingBottom: 16, paddingTop: compactMode ? 4 : 10 },
                  ]}
                >
                  <SlideGraphic
                    slide={slide}
                    colors={slide.accent}
                    heroSize={heroSize}
                    compactMode={compactMode}
                  />

                  <View style={styles.textBlock}>
                    <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleLineHeight }]}>
                      {slide.title}
                    </Text>
                    <Text
                      style={[
                        styles.description,
                        { fontSize: descriptionSize, lineHeight: descriptionLineHeight },
                      ]}
                    >
                      {slide.description}
                    </Text>
                  </View>

                  <View style={[styles.pointsCard, compactMode && styles.pointsCardCompact]}>
                    {slide.points.map((point, index) => (
                      <View
                        key={point}
                        style={[
                          styles.pointRow,
                          index === slide.points.length - 1 && styles.pointRowLast,
                        ]}
                      >
                        <Icon name="check-circle-outline" size={18} color="#4f46e5" />
                        <Text style={styles.pointText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 12) + 10,
            },
          ]}
        >
          <View style={styles.pagination}>
            {onboardingSlides.map((slide, index) => (
              <View key={slide.id} style={[styles.dot, index === currentIndex && styles.dotActive]} />
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
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topRow: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandSlot: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: 44,
  },
  headerLogo: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  headerLogoSpacer: {
    width: 46,
    height: 46,
  },
  skipButton: {
    minWidth: 52,
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  skipSpacer: {
    width: 52,
  },
  carouselArea: {
    flex: 1,
  },
  horizontalPager: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
  },
  slideScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  graphicWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  logoGlow: {
    position: 'absolute',
    opacity: 0.18,
  },
  logoHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.12)',
  },
  logoFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  graphicGlow: {
    position: 'absolute',
    opacity: 0.14,
  },
  graphicRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.12)',
  },
  graphicRingOuter: {},
  graphicRingMiddle: {},
  graphicCore: {
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
    top: 34,
    left: 42,
  },
  bubbleTopRight: {
    top: 62,
    right: 46,
  },
  bubbleBottom: {
    bottom: 36,
    left: '50%',
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 22,
  },
  title: {
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
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
  pointsCardCompact: {
    padding: 18,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pointRowLast: {
    marginBottom: 0,
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
