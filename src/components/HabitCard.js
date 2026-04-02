import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from "react-native";
import { Card, Chip, ProgressBar } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as Haptics from "expo-haptics";

import FirebaseService from "../services/FirebaseService";
import AICoachingChat from "./AICoachingChat";
import TipCard from "./TipCard";
import {
  getHabitScheduleLabel,
  getImplementationPlanText,
  getWeeklyCompletionPercent,
  getNextDueLabel,
} from "../utils/habitHelpers";
import {
  checkInternetConnection,
  showInternetRequiredAlert,
} from "../utils/networkUtils";

const HabitCard = ({
  habit,
  onComplete,
  onEdit,
  onDelete,
  isCompleted,
  showActions = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showAICoaching, setShowAICoaching] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;

    const loadStatus = async () => {
      try {
        const userStats = await FirebaseService.getUserStats();
        const premiumStatus = !!userStats?.isPremium;
        let adminStatus = false;
        const user = FirebaseService.currentUser;
        if (user?.email) {
          const AdminService = require("../services/AdminService").default;
          adminStatus = await AdminService.checkAdminStatus(user.email);
        }
        if (!mounted) return;
        setIsPremium(premiumStatus || adminStatus);
        setIsAdmin(adminStatus);
      } catch (error) {
        if (!mounted) return;
        setIsPremium(false);
        setIsAdmin(false);
      }
    };

    loadStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const weeklyProgress = useMemo(
    () => getWeeklyCompletionPercent(habit),
    [habit],
  );
  const scheduleLabel = useMemo(() => getHabitScheduleLabel(habit), [habit]);
  const implementationPlan = useMemo(
    () => getImplementationPlanText(habit),
    [habit],
  );
  const nextDueLabel = useMemo(() => getNextDueLabel(habit), [habit]);
  const hasAIAccess = isPremium || isAdmin;

  const handleAICoaching = async () => {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      showInternetRequiredAlert("AI Coaching");
      return;
    }
    setShowAICoaching(true);
  };

  const handleComplete = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();

      let result;
      if (isCompleted) {
        result = await FirebaseService.uncompleteHabit(habit.id);
      } else {
        result = await FirebaseService.completeHabit(habit.id);
      }

      if (onComplete) {
        onComplete(habit, !isCompleted, result || {});
      }
    } catch (error) {
      Alert.alert(
        "Could not update habit",
        error.message || "Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete habit?", `Remove "${habit.name}" from your list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete && onDelete(habit.id),
      },
    ]);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      health: "heart-pulse",
      fitness: "dumbbell",
      productivity: "briefcase-outline",
      learning: "book-open-page-variant-outline",
      wellness: "leaf",
      creativity: "palette-outline",
      social: "account-group-outline",
      finance: "cash-multiple",
    };
    return icons[category] || "target";
  };

  const getDifficultyColor = (difficulty = 1) => {
    if (difficulty >= 5) return "#dc2626";
    if (difficulty >= 4) return "#f97316";
    if (difficulty >= 3) return "#f59e0b";
    if (difficulty >= 2) return "#06b6d4";
    return "#10b981";
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Card style={[styles.card, isCompleted && styles.completedCard]}>
          <LinearGradient
            colors={
              isCompleted ? ["#10b981", "#059669"] : ["#ffffff", "#f8fafc"]
            }
            style={styles.gradient}
          >
            <View style={styles.header}>
              <View style={styles.titleWrap}>
                <View style={styles.titleRow}>
                  <View
                    style={[
                      styles.iconBadge,
                      isCompleted && styles.completedIconBadge,
                    ]}
                  >
                    <Icon
                      name={getCategoryIcon(habit.category)}
                      size={20}
                      color={isCompleted ? "#ffffff" : "#4f46e5"}
                    />
                  </View>
                  <View style={styles.textWrap}>
                    <Text
                      style={[
                        styles.title,
                        isCompleted && styles.completedText,
                      ]}
                      numberOfLines={2}
                    >
                      {habit.name}
                    </Text>
                    <Text
                      style={[
                        styles.subtitle,
                        isCompleted && styles.completedSubtle,
                      ]}
                    >
                      {nextDueLabel}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => setShowTip((value) => !value)}
                  >
                    <Icon
                      name={
                        showTip ? "close-circle-outline" : "lightbulb-outline"
                      }
                      size={22}
                      color={isCompleted ? "#ffffff" : "#4f46e5"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.aiButton}
                    onPress={handleAICoaching}
                  >
                    <Icon
                      name="robot-excited-outline"
                      size={22}
                      color={isCompleted ? "#ffffff" : "#f59e0b"}
                    />
                  </TouchableOpacity>
                </View>

                {!!habit.description && (
                  <Text
                    style={[
                      styles.description,
                      isCompleted && styles.completedSubtle,
                    ]}
                    numberOfLines={2}
                  >
                    {habit.description}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.checkButton,
                  isCompleted && styles.checkButtonDone,
                ]}
                onPress={handleComplete}
                disabled={isLoading}
              >
                <Icon
                  name={isCompleted ? "check-circle" : "circle-outline"}
                  size={34}
                  color={isCompleted ? "#ffffff" : "#4f46e5"}
                />
              </TouchableOpacity>
            </View>

            {showTip ? (
              <TipCard
                compact
                icon="lightbulb-on-outline"
                title="Habit tip"
                description={
                  implementationPlan ||
                  `Make ${habit.name} easier by linking it to a clear cue, place, and small reward.`
                }
                onDismiss={() => setShowTip(false)}
                style={styles.tipCard}
              />
            ) : null}

            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Icon
                  name="fire"
                  size={16}
                  color={isCompleted ? "#ffffff" : "#f97316"}
                />
                <Text
                  style={[
                    styles.metricText,
                    isCompleted && styles.completedText,
                  ]}
                >
                  {habit.currentStreak || 0} streak
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Icon
                  name="trophy-outline"
                  size={16}
                  color={isCompleted ? "#ffffff" : "#8b5cf6"}
                />
                <Text
                  style={[
                    styles.metricText,
                    isCompleted && styles.completedText,
                  ]}
                >
                  Best {habit.longestStreak || 0}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Icon
                  name="check-all"
                  size={16}
                  color={isCompleted ? "#ffffff" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.metricText,
                    isCompleted && styles.completedText,
                  ]}
                >
                  {habit.totalCompletions || 0} done
                </Text>
              </View>
            </View>

            <View style={styles.progressHeader}>
              <Text
                style={[
                  styles.progressLabel,
                  isCompleted && styles.completedText,
                ]}
              >
                This week
              </Text>
              <Text
                style={[
                  styles.progressValue,
                  isCompleted && styles.completedText,
                ]}
              >
                {weeklyProgress}%
              </Text>
            </View>
            <ProgressBar
              progress={weeklyProgress / 100}
              color={isCompleted ? "#ffffff" : "#4f46e5"}
              style={styles.progressBar}
            />

            <View style={styles.chipsRow}>
              <Chip
                compact
                style={styles.chip}
                textStyle={styles.chipText}
                icon="calendar-week"
              >
                {scheduleLabel}
              </Chip>
              <Chip
                compact
                style={styles.chip}
                textStyle={styles.chipText}
                icon="clock-outline"
              >
                {habit.estimatedTime || "5 min"}
              </Chip>
              <Chip
                compact
                style={styles.chip}
                textStyle={styles.chipText}
                icon="signal-cellular-2"
              >
                {`Difficulty ${habit.difficulty || 1}`}
              </Chip>
            </View>

            {implementationPlan ? (
              <View style={styles.planBox}>
                <Icon
                  name="route"
                  size={16}
                  color={isCompleted ? "#ffffff" : "#4f46e5"}
                />
                <Text
                  style={[styles.planText, isCompleted && styles.completedText]}
                  numberOfLines={2}
                >
                  {implementationPlan}
                </Text>
              </View>
            ) : null}

            <View style={styles.lockedStrip}>
              <Icon
                name={
                  hasAIAccess
                    ? "robot-excited-outline"
                    : "ticket-percent-outline"
                }
                size={16}
                color={hasAIAccess ? "#f59e0b" : "#7c3aed"}
              />
              <Text style={styles.lockedText}>
                {hasAIAccess
                  ? "Unlimited AI coaching is active on this habit."
                  : "Free plan includes 2 AI coaching sessions per day. Premium unlocks unlimited coaching."}
              </Text>
            </View>

            {showActions ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEdit && onEdit(habit)}
                >
                  <Icon
                    name="pencil-outline"
                    size={18}
                    color={isCompleted ? "#ffffff" : "#4f46e5"}
                  />
                  <Text
                    style={[
                      styles.actionLabel,
                      isCompleted && styles.completedText,
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDelete}
                >
                  <Icon
                    name="delete-outline"
                    size={18}
                    color={isCompleted ? "#ffffff" : "#ef4444"}
                  />
                  <Text
                    style={[
                      styles.actionLabel,
                      isCompleted && styles.completedText,
                    ]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
                <View
                  style={[
                    styles.difficultyPill,
                    {
                      backgroundColor: isCompleted
                        ? "rgba(255,255,255,0.18)"
                        : `${getDifficultyColor(habit.difficulty)}18`,
                    },
                  ]}
                >
                  <Icon
                    name="star-four-points-outline"
                    size={16}
                    color={
                      isCompleted
                        ? "#ffffff"
                        : getDifficultyColor(habit.difficulty)
                    }
                  />
                  <Text
                    style={[
                      styles.difficultyText,
                      isCompleted && styles.completedText,
                    ]}
                  >
                    {habit.reminderEnabled ? "Reminder on" : "Reminder off"}
                  </Text>
                </View>
              </View>
            ) : null}
          </LinearGradient>
        </Card>
      </Animated.View>

      <AICoachingChat
        visible={showAICoaching}
        onDismiss={() => setShowAICoaching(false)}
        habit={habit}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  completedCard: {
    shadowOpacity: 0.08,
  },
  gradient: {
    padding: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2ff",
  },
  completedIconBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: "#4b5563",
  },
  helpButton: {
    padding: 4,
  },
  aiButton: {
    padding: 4,
  },
  checkButton: {
    width: 46,
    alignItems: "center",
  },
  checkButtonDone: {
    transform: [{ scale: 1.02 }],
  },
  tipCard: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: "28%",
  },
  metricText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "700",
  },
  progressValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "800",
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  chip: {
    backgroundColor: "rgba(79,70,229,0.08)",
  },
  chipText: {
    color: "#4338ca",
    fontSize: 12,
    fontWeight: "700",
  },
  planBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.75)",
    flexDirection: "row",
    gap: 8,
  },
  planText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#374151",
  },
  lockedStrip: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lockedText: {
    flex: 1,
    fontSize: 12,
    color: "#5b21b6",
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  difficultyPill: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  completedText: {
    color: "#ffffff",
  },
  completedSubtle: {
    color: "rgba(255,255,255,0.88)",
  },
});

export default HabitCard;
