import React, { useEffect, useMemo, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { Button } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const CelebrationModal = ({ visible, title, subtitle, badge, onClose }) => {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const particles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => ({
        key: index,
        anim: new Animated.Value(0),
      })),
    [],
  );

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.8);
      opacity.setValue(0);
      particles.forEach((item) => item.anim.setValue(0));
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();

    particles.forEach((item, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 70),
          Animated.timing(item.anim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(item.anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [visible, opacity, particles, scale]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
        <Animated.View
          style={[styles.cardWrap, { opacity, transform: [{ scale }] }]}
        >
          <LinearGradient colors={["#4f46e5", "#7c3aed"]} style={styles.card}>
            {particles.map((item, index) => {
              const translateY = item.anim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, -90],
              });
              const translateX = item.anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, (index % 2 === 0 ? -1 : 1) * (20 + index * 4)],
              });
              const particleOpacity = item.anim.interpolate({
                inputRange: [0, 0.1, 1],
                outputRange: [0, 1, 0],
              });

              return (
                <Animated.Text
                  key={item.key}
                  style={[
                    styles.particle,
                    {
                      left: `${12 + index * 10}%`,
                      opacity: particleOpacity,
                      transform: [{ translateY }, { translateX }],
                    },
                  ]}
                >
                  {index % 2 === 0 ? "✨" : "🎉"}
                </Animated.Text>
              );
            })}

            <View style={styles.iconWrap}>
              <Icon name="party-popper" size={34} color="#4f46e5" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.ctaWrap}
              activeOpacity={0.9}
              onPress={onClose}
            >
              <Button
                mode="contained"
                buttonColor="#ffffff"
                textColor="#4f46e5"
                onPress={onClose}
              >
                Keep going
              </Button>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  cardWrap: {
    width: "100%",
    maxWidth: 360,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
  },
  badge: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  ctaWrap: {
    marginTop: 20,
    width: "100%",
  },
  particle: {
    position: "absolute",
    top: "58%",
    fontSize: 18,
  },
});

export default CelebrationModal;
