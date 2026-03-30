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

const SlideGraphic = ({ slide, colors, heroSize, shellSize, bubbleSize, badgeIconSize, graphicHeight }) => {
  if (slide.id === 'welcome') {
    return (
      <View style={[styles.graphicWrapper, { height: graphicHeight }]}> 
        <LinearGradient
          colors={colors}
          style={[
            styles.logoGlow,
            {
              width: shellSize + 48,
              height: shellSize + 48,
              borderRadius: (shellSize + 48) / 2,
            },
          ]}
        />

        <View
          style={[
            styles.logoHalo,
            {
              width: shellSize + 20,
              height: shellSize + 20,
              borderRadius: (shellSize + 20) / 2,
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
    <View style={[styles.graphicWrapper, { height: graphicHeight }]}> 
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
            width: shellSize + 34,
            height: shellSize + 34,
            borderRadius: (shellSize + 34) / 2,
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
        <Icon name={slide.icon} size={Math.max(48, heroSize * 0.52)} color="#ffffff" />
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

  const usableHeight = height - insets.top - insets.bottom;
  const microCompactMode = usableHeight < 670;
  const veryCompactMode = usableHeight < 720;
  const compactMode = usableHeight < 780;

  const heroSize = microCompactMode ? 84 : veryCompactMode ? 96 : compactMode ? 112 : 136;
  const shellSize = heroSize + (microCompactMode ? 28 : veryCompactMode ? 32 : 42);
  const bubbleSize = microCompactMode ? 34 : compactMode ? 38 : 42;
  const badgeIconSize = microCompactMode ? 15 : compactMode ? 17 : 19;
  const graphicHeight = microCompactMode ? 148 : veryCompactMode ? 170 : compactMode ? 198 : 236;

  const titleSize = microCompactMode ? 22 : veryCompactMode ? 24 : compactMode ? 27 : 30;
  const titleLineHeight = microCompactMode ? 28 : veryCompactMode ? 31 : compactMode ? 35 : 38;
  const descriptionSize = microCompactMode ? 13 : veryCompactMode ? 14 : compactMode ? 15 : 16;
  const descriptionLineHeight = microCompactMode ? 19 : veryCompactMode ? 21 : compactMode ? 23 : 25;
  const pointTextSize = microCompactMode ? 13 : compactMode ? 14 : 15;
  const pointCardPadding = microCompactMode ? 14 : compactMode ? 16 : 20;
  const footerNoteSize = microCompactMode ? 10.5 : 12;
  const footerNoteLineHeight = microCompactMode ? 15 : 18;
  const buttonHeight = microCompactMode ? 48 : 54;

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
        <View style={[styles.topRow, { minHeight: microCompactMode ? 34 : 42 }]}> 
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
                <View style={styles.slideContent}>
                  <View>
                    <SlideGraphic
                      slide={slide}
                      colors={slide.accent}
                      heroSize={heroSize}
                      shellSize={shellSize}
                      bubbleSize={bubbleSize}
                      badgeIconSize={badgeIconSize}
                      graphicHeight={graphicHeight}
                    />

                    <View style={[styles.textBlock, { marginBottom: microCompactMode ? 14 : 18 }]}> 
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
                  </View>

                  <View
                    style={[
                      styles.pointsCard,
                      {
                        padding: pointCardPadding,
                        borderRadius: microCompactMode ? 18 : 24,
                      },
                    ]}
                  >
                    {slide.points.map((point, index) => (
                      <View
                        key={point}
                        style={[
                          styles.pointRow,
                          index === slide.points.length - 1 && styles.pointRowLast,
                          { marginBottom: microCompactMode ? 10 : 12 },
                        ]}
                      >
                        <Icon name="check-circle-outline" size={microCompactMode ? 16 : 18} color="#4f46e5" />
                        <Text style={[styles.pointText, { fontSize: pointTextSize }]}> 
                          {point}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingTop: microCompactMode ? 8 : 12,
              paddingBottom: Math.max(insets.bottom, microCompactMode ? 8 : 10) + 6,
            },
          ]}
        >
          <View style={[styles.pagination, { marginBottom: microCompactMode ? 14 : 20 }]}> 
            {onboardingSlides.map((slide, index) => (
              <View key={slide.id} style={[styles.dot, index === currentIndex && styles.dotActive]} />
            ))}
          </View>

          <Button
            mode="contained"
            onPress={handleNext}
            contentStyle={[styles.primaryButtonContent, { height: buttonHeight }]}
            style={[styles.primaryButton, { marginBottom: microCompactMode ? 10 : 14 }]}
            buttonColor="#4f46e5"
            icon={isLastSlide ? 'rocket-launch' : 'arrow-right'}
          >
            {isLastSlide ? 'Get Started' : 'Next'}
          </Button>

          <Text
            style={[
              styles.footerNote,
              { fontSize: footerNoteSize, lineHeight: footerNoteLineHeight },
            ]}
          >
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
    justifyContent: 'flex-end',
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
  slideContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 4,
  },
  graphicWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
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
    top: 20,
    left: 42,
  },
  bubbleTopRight: {
    top: 38,
    right: 46,
  },
  bubbleBottom: {
    bottom: 20,
    left: '50%',
  },
  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 320,
  },
  pointsCard: {
    backgroundColor: '#ffffff',
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
  },
  pointRowLast: {
    marginBottom: 0,
  },
  pointText: {
    flex: 1,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  primaryButtonContent: {
    height: 54,
  },
  footerNote: {
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default OnboardingScreen;
