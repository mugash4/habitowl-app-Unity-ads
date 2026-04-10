import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Appbar,
  Button,
  Card,
  Chip,
  Switch,
  TextInput,
} from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import FirebaseService from "../services/FirebaseService";
import NotificationService from "../services/NotificationService";
import TipsService from "../services/TipsService";
import TipCard from "../components/TipCard";
import PremiumFeatureCard from "../components/PremiumFeatureCard";
import AdMobBanner from "../components/AdMobBanner";
import adMobService from "../services/AdMobService";
import {
  DAY_OPTIONS,
  SCHEDULE_OPTIONS,
  normalizeHabitSchedule,
} from "../utils/habitHelpers";

const CATEGORY_OPTIONS = [
  { value: "wellness", label: "Wellness", icon: "leaf" },
  { value: "fitness", label: "Fitness", icon: "dumbbell" },
  { value: "productivity", label: "Productivity", icon: "briefcase-outline" },
  {
    value: "learning",
    label: "Learning",
    icon: "book-open-page-variant-outline",
  },
  { value: "health", label: "Health", icon: "heart-pulse" },
  { value: "creativity", label: "Creativity", icon: "palette-outline" },
  { value: "social", label: "Social", icon: "account-group-outline" },
  { value: "finance", label: "Finance", icon: "cash-multiple" },
];
const TIME_OPTIONS = [
  "5 min",
  "10 min",
  "15 min",
  "20 min",
  "30 min",
  "45 min",
  "1 hour",
];

const EditHabitScreen = ({ navigation, route }) => {
  const { habit } = route.params;
  const normalizedHabit = normalizeHabitSchedule(habit);

  const [habitName, setHabitName] = useState(habit.name || "");
  const [description, setDescription] = useState(habit.description || "");
  const [category, setCategory] = useState(habit.category || "wellness");
  const [difficulty, setDifficulty] = useState(habit.difficulty || 2);
  const [estimatedTime, setEstimatedTime] = useState(
    habit.estimatedTime || "10 min",
  );
  const [scheduleType, setScheduleType] = useState(
    normalizedHabit.scheduleType || "daily",
  );
  const [selectedDays, setSelectedDays] = useState(
    normalizedHabit.selectedDays || [1, 2, 3, 4, 5],
  );
  const [weeklyTarget, setWeeklyTarget] = useState(
    normalizedHabit.weeklyTarget || 3,
  );
  const [cue, setCue] = useState(normalizedHabit.cue || "");
  const [location, setLocation] = useState(normalizedHabit.location || "");
  const [reward, setReward] = useState(normalizedHabit.reward || "");
  const [reminderEnabled, setReminderEnabled] = useState(
    !!habit.reminderEnabled,
  );
  const [reminderTime, setReminderTime] = useState(() => {
    if (!habit.reminderTime) return new Date();
    const [hours, minutes] = habit.reminderTime.split(":").map(Number);
    const value = new Date();
    value.setHours(hours, minutes, 0, 0);
    return value;
  });
  const [customMessage, setCustomMessage] = useState(
    habit.reminderMessage || "",
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const [stats, seenGuide] = await Promise.all([
        FirebaseService.getUserStats(),
        TipsService.hasSeenGuide("edit_habit"),
      ]);
      let adminStatus = false;
      const currentUser = FirebaseService.currentUser;
      if (currentUser?.email) {
        const AdminService = require("../services/AdminService").default;
        adminStatus = await AdminService.checkAdminStatus(currentUser.email);
      }
      setIsPremium(!!stats?.isPremium || adminStatus);
      setIsAdmin(adminStatus);
      setShowGuide(!seenGuide);
    };
    bootstrap();
  }, []);

  const categoryMeta = useMemo(
    () => CATEGORY_OPTIONS.find((item) => item.value === category),
    [category],
  );
  const canUseAdvancedSchedule = isPremium || isAdmin;
  const canUseCustomReminderMessage = isPremium || isAdmin;

  const toggleSelectedDay = (dayValue) => {
    setSelectedDays((current) => {
      if (current.includes(dayValue)) {
        const next = current.filter((value) => value !== dayValue);
        return next.length ? next : current;
      }
      return [...current, dayValue].sort((a, b) => a - b);
    });
  };

  const validate = () => {
    if (!habitName.trim()) {
      Alert.alert("Habit name required", "Please enter a habit name.");
      return false;
    }
    if (scheduleType === "custom" && selectedDays.length === 0) {
      Alert.alert("Choose days", "Select at least one custom day.");
      return false;
    }
    if (scheduleType === "timesPerWeek" && !canUseAdvancedSchedule) {
      Alert.alert(
        "Premium feature",
        "Weekly target scheduling is visible here but unlocked on Premium.",
      );
      return false;
    }
    return true;
  };

  const saveHabit = async () => {
    if (!validate()) return;

    try {
      setIsLoading(true);
      const updates = {
        name: habitName.trim(),
        description: description.trim(),
        category,
        difficulty,
        estimatedTime,
        scheduleType,
        selectedDays,
        weeklyTarget,
        cue: cue.trim(),
        location: location.trim(),
        reward: reward.trim(),
        reminderEnabled,
        reminderTime: reminderEnabled
          ? reminderTime.toTimeString().slice(0, 5)
          : null,
        reminderMessage: canUseCustomReminderMessage
          ? customMessage.trim() || null
          : null,
      };

      const updatedHabit = await FirebaseService.updateHabit(habit.id, updates);
      navigation.goBack();

      if (reminderEnabled) {
        NotificationService.scheduleHabitReminder(updatedHabit).catch(() => {});
      } else {
        NotificationService.cancelHabitNotifications(habit.id).catch(() => {});
      }
      FirebaseService.trackEvent("habit_updated_v2", {
        habitId: habit.id,
        scheduleType,
      }).catch(() => {});
      adMobService.showInterstitialAd("habit_updated").catch(() => {});
    } catch (error) {
      Alert.alert(
        "Could not update habit",
        error.message || "Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHabit = () => {
    Alert.alert(
      "Delete habit?",
      "This will remove the habit and its reminders.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await FirebaseService.deleteHabit(habit.id);
              navigation.goBack();
              NotificationService.cancelHabitNotifications(habit.id).catch(() => {});
              adMobService.showInterstitialAd("habit_deleted").catch(() => {});
            } catch (error) {
              Alert.alert(
                "Could not delete habit",
                error.message || "Please try again.",
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title="Edit habit"
          subtitle={`Current streak ${habit.currentStreak || 0}`}
        />
        <Appbar.Action icon="delete-outline" onPress={deleteHabit} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {showGuide ? (
          <TipCard
            title="Keep editing simple"
            description="Use this screen to refine schedule, cue, and reminders without making the habit too complex."
            onDismiss={async () => {
              await TipsService.markGuideSeen("edit_habit");
              setShowGuide(false);
            }}
            onStopTips={async () => {
              await TipsService.setTipsEnabled(false);
              setShowGuide(false);
            }}
            style={styles.sectionSpacing}
          />
        ) : null}

        <Card style={styles.card}>
          <View style={styles.previewRow}>
            <Icon
              name={categoryMeta?.icon || "target"}
              size={22}
              color="#4f46e5"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.previewTitle}>{habitName || "Habit"}</Text>
              <Text style={styles.previewText}>
                Best streak {habit.longestStreak || 0} • Total completions{" "}
                {habit.totalCompletions || 0}
              </Text>
            </View>
          </View>
        </Card>

        {!isPremium && !isAdmin ? (
          <AdMobBanner style={styles.bannerSpacing} />
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Basic details</Text>
          <TextInput
            mode="outlined"
            label="Habit name"
            value={habitName}
            onChangeText={setHabitName}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Description"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipWrap}>
            {CATEGORY_OPTIONS.map((item) => (
              <Chip
                key={item.value}
                selected={category === item.value}
                onPress={() => setCategory(item.value)}
                style={styles.choiceChip}
                icon={item.icon}
              >
                {item.label}
              </Chip>
            ))}
          </View>
          <Text style={styles.label}>Time needed</Text>
          <View style={styles.chipWrap}>
            {TIME_OPTIONS.map((option) => (
              <Chip
                key={option}
                selected={estimatedTime === option}
                onPress={() => setEstimatedTime(option)}
                style={styles.choiceChip}
              >
                {option}
              </Chip>
            ))}
          </View>
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.chipWrap}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Chip
                key={value}
                selected={difficulty === value}
                onPress={() => setDifficulty(value)}
                style={styles.choiceChip}
                icon="star-outline"
              >
                {value}
              </Chip>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Schedule</Text>
          <View style={styles.scheduleList}>
            {SCHEDULE_OPTIONS.map((option) => {
              const locked =
                option.value === "timesPerWeek" && !canUseAdvancedSchedule;
              const selected = scheduleType === option.value;
              return (
                <Card
                  key={option.value}
                  style={[
                    styles.scheduleCard,
                    selected && styles.scheduleCardSelected,
                    locked && styles.lockedCard,
                  ]}
                  onPress={() => {
                    if (locked) {
                      navigation.getParent()?.navigate("Premium");
                      return;
                    }
                    setScheduleType(option.value);
                  }}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.scheduleTitle}>{option.label}</Text>
                      <Text style={styles.scheduleDescription}>
                        {option.description}
                      </Text>
                    </View>
                    <Icon
                      name={
                        locked
                          ? "lock-outline"
                          : selected
                            ? "check-circle"
                            : "circle-outline"
                      }
                      size={22}
                      color={locked ? "#7c3aed" : "#4f46e5"}
                    />
                  </View>
                </Card>
              );
            })}
          </View>

          {scheduleType === "custom" ? (
            <View style={styles.dayWrap}>
              {DAY_OPTIONS.map((day) => (
                <Chip
                  key={day.value}
                  selected={selectedDays.includes(day.value)}
                  onPress={() => toggleSelectedDay(day.value)}
                  style={styles.choiceChip}
                >
                  {day.short}
                </Chip>
              ))}
            </View>
          ) : null}

          {scheduleType === "timesPerWeek" ? (
            <View style={styles.chipWrap}>
              {[2, 3, 4, 5, 6].map((value) => (
                <Chip
                  key={value}
                  selected={weeklyTarget === value}
                  onPress={() => setWeeklyTarget(value)}
                  style={styles.choiceChip}
                >
                  {value}x / week
                </Chip>
              ))}
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Implementation plan</Text>
          <TextInput
            mode="outlined"
            label="Cue"
            value={cue}
            onChangeText={setCue}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Location"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Reward"
            value={reward}
            onChangeText={setReward}
            style={styles.input}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.cardTitle}>Reminder</Text>
              <Text style={styles.sectionText}>
                Your reminder respects the current schedule and selected days.
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
            />
          </View>

          {reminderEnabled ? (
            <>
              <Button
                mode="outlined"
                icon="clock-outline"
                onPress={() => setShowTimePicker(true)}
                style={styles.timeButton}
              >
                {reminderTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Button>
              {showTimePicker ? (
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  is24Hour={false}
                  onChange={(event, value) => {
                    setShowTimePicker(false);
                    if (value) setReminderTime(value);
                  }}
                />
              ) : null}

              {canUseCustomReminderMessage ? (
                <TextInput
                  mode="outlined"
                  label="Custom reminder message"
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  style={styles.input}
                  multiline
                />
              ) : (
                <PremiumFeatureCard
                  title="Custom reminder messages"
                  description="Visible here for all users so the upgrade path feels clear."
                  bullets={[
                    "Personal message for each habit",
                    "Premium-only reminder customization",
                  ]}
                  onPress={() => navigation.getParent()?.navigate("Premium")}
                />
              )}
            </>
          ) : null}
        </Card>

        <Button
          mode="contained"
          onPress={saveHabit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.saveButton}
        >
          Save changes
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 32 },
  sectionSpacing: { marginBottom: 12 },
  bannerSpacing: { marginBottom: 16 },
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  input: { marginBottom: 10, backgroundColor: "#ffffff" },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginTop: 4,
    marginBottom: 8,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceChip: { marginBottom: 8 },
  scheduleList: { gap: 10 },
  scheduleCard: { borderRadius: 18, padding: 14, backgroundColor: "#f8fafc" },
  scheduleCardSelected: {
    borderWidth: 1,
    borderColor: "#4f46e5",
    backgroundColor: "#eef2ff",
  },
  lockedCard: { backgroundColor: "#faf5ff" },
  scheduleTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  scheduleDescription: { marginTop: 4, fontSize: 13, color: "#6b7280" },
  dayWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeButton: { alignSelf: "flex-start", marginBottom: 12 },
  sectionText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6b7280",
    marginBottom: 12,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  previewText: { marginTop: 4, fontSize: 13, color: "#6b7280" },
  saveButton: { borderRadius: 16, paddingVertical: 6 },
});

export default EditHabitScreen;
