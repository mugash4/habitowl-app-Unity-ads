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
  HelperText,
  Switch,
  TextInput,
} from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import FirebaseService from "../services/FirebaseService";
import NotificationService from "../services/NotificationService";
import TipsService from "../services/TipsService";
import HabitTemplateService from "../services/HabitTemplateService";
import TipCard from "../components/TipCard";
import PremiumFeatureCard from "../components/PremiumFeatureCard";
import { DAY_OPTIONS, SCHEDULE_OPTIONS } from "../utils/habitHelpers";

const FREE_HABIT_LIMIT = 5;
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

const CreateHabitScreen = ({ navigation }) => {
  const [habitName, setHabitName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("wellness");
  const [difficulty, setDifficulty] = useState(2);
  const [estimatedTime, setEstimatedTime] = useState("10 min");
  const [scheduleType, setScheduleType] = useState("daily");
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [cue, setCue] = useState("");
  const [location, setLocation] = useState("");
  const [reward, setReward] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const templates = HabitTemplateService.getTemplates();
  const canUseAdvancedSchedule = isPremium || isAdmin;
  const canUseCustomReminderMessage = isPremium || isAdmin;

  useEffect(() => {
    const bootstrap = async () => {
      const [stats, seenGuide] = await Promise.all([
        FirebaseService.getUserStats(),
        TipsService.hasSeenGuide("create_habit"),
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

  const selectedCategoryMeta = useMemo(
    () => CATEGORY_OPTIONS.find((item) => item.value === category),
    [category],
  );

  const toggleSelectedDay = (dayValue) => {
    setSelectedDays((current) => {
      if (current.includes(dayValue)) {
        const next = current.filter((value) => value !== dayValue);
        return next.length ? next : current;
      }
      return [...current, dayValue].sort((a, b) => a - b);
    });
  };

  const fillTemplate = (template) => {
    if (template.premiumOnly && !isPremium && !isAdmin) {
      return navigation.getParent()?.navigate("Premium");
    }
    setHabitName(template.title);
    setDescription(template.description);
    setCategory(template.category);
    setDifficulty(template.difficulty);
    setEstimatedTime(template.estimatedTime);
    setScheduleType(template.scheduleType || "daily");
    setSelectedDays(template.selectedDays || [1, 2, 3, 4, 5]);
    setWeeklyTarget(template.weeklyTarget || 3);
    setCue(template.cue || "");
    setLocation(template.location || "");
    setReward(template.reward || "");
  };

  const validate = () => {
    if (!habitName.trim()) {
      Alert.alert("Habit name required", "Please enter a clear habit name.");
      return false;
    }
    if (habitName.trim().length < 3) {
      Alert.alert(
        "Habit name too short",
        "Use at least 3 characters so the habit is easy to understand.",
      );
      return false;
    }
    if (scheduleType === "custom" && selectedDays.length === 0) {
      Alert.alert(
        "Choose days",
        "Please select at least one day for your custom schedule.",
      );
      return false;
    }
    return true;
  };

  const checkFreeLimit = async () => {
    const userHabits = await FirebaseService.getUserHabits();
    return userHabits.length < FREE_HABIT_LIMIT || isPremium || isAdmin;
  };

  const saveHabit = async () => {
    if (!validate()) return;

    const canCreate = await checkFreeLimit();
    if (!canCreate) {
      return Alert.alert(
        "Free plan limit reached",
        "You can create up to 5 habits on the free plan. Upgrade to Premium for unlimited habits.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "See Premium",
            onPress: () => navigation.getParent()?.navigate("Premium"),
          },
        ],
      );
    }

    if (scheduleType === "timesPerWeek" && !canUseAdvancedSchedule) {
      return Alert.alert(
        "Premium feature",
        "The weekly target schedule stays visible here so free users can preview it. Upgrade to unlock it.",
      );
    }

    try {
      setIsLoading(true);
      const habitData = {
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

      const newHabit = await FirebaseService.createHabit(habitData);
      if (reminderEnabled) {
        await NotificationService.scheduleHabitReminder(newHabit);
        await NotificationService.scheduleWeeklyReviewPrompt();
      }
      await FirebaseService.trackEvent("habit_created_v2", {
        category,
        scheduleType,
        reminderEnabled,
      });

      Alert.alert("Habit created", `${habitName.trim()} is ready to track.`);
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Could not create habit",
        error.message || "Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title="Create habit"
          subtitle="Build something users can stick with"
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {showGuide ? (
          <TipCard
            title="Create habits that feel easy to start"
            description="The best habits are small, clearly scheduled, and attached to a cue. Free users can still see premium options before upgrading."
            onDismiss={async () => {
              await TipsService.markGuideSeen("create_habit");
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
          <Text style={styles.cardTitle}>Quick starter packs</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateRow}
          >
            {templates.map((template) => {
              const locked = template.premiumOnly && !isPremium && !isAdmin;
              return (
                <Card
                  key={template.id}
                  style={[styles.templateCard, locked && styles.lockedCard]}
                >
                  <Chip compact style={styles.templateChip}>
                    {locked ? "Premium" : "Template"}
                  </Chip>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                  <Text style={styles.templateDescription}>
                    {template.description}
                  </Text>
                  <Button
                    mode={locked ? "contained-tonal" : "contained"}
                    onPress={() => fillTemplate(template)}
                  >
                    {locked ? "Unlock" : "Use"}
                  </Button>
                </Card>
              );
            })}
          </ScrollView>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Basic details</Text>
          <TextInput
            mode="outlined"
            label="Habit name"
            value={habitName}
            onChangeText={setHabitName}
            style={styles.input}
            maxLength={50}
          />
          <HelperText type="info">
            Choose a clear action like “Walk 10 minutes” instead of a vague
            goal.
          </HelperText>

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
          <View style={styles.difficultyRow}>
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
          <Text style={styles.sectionText}>
            Visible to everyone. Advanced weekly targets are locked for Premium.
          </Text>
          <View style={styles.scheduleList}>
            {SCHEDULE_OPTIONS.map((option) => {
              const locked =
                option.value === "timesPerWeek" && !canUseAdvancedSchedule;
              const selected = scheduleType === option.value;
              return (
                <TouchableSchedule
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={selected}
                  locked={locked}
                  onPress={() => {
                    if (locked) {
                      navigation.getParent()?.navigate("Premium");
                      return;
                    }
                    setScheduleType(option.value);
                  }}
                />
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
                  style={styles.dayChip}
                >
                  {day.short}
                </Chip>
              ))}
            </View>
          ) : null}

          {scheduleType === "timesPerWeek" ? (
            <View>
              <Text style={styles.label}>Weekly target</Text>
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
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Implementation plan</Text>
          <Text style={styles.sectionText}>
            This turns a habit into an exact “when, where, reward” plan.
          </Text>
          <TextInput
            mode="outlined"
            label="When will it happen?"
            value={cue}
            onChangeText={setCue}
            style={styles.input}
            placeholder="after I make coffee"
          />
          <TextInput
            mode="outlined"
            label="Where will it happen?"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
            placeholder="kitchen table"
          />
          <TextInput
            mode="outlined"
            label="Reward / good feeling"
            value={reward}
            onChangeText={setReward}
            style={styles.input}
            placeholder="feel organized before work"
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.cardTitle}>Reminder</Text>
              <Text style={styles.sectionText}>
                Local reminders work on device and support your selected
                schedule.
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
                  description="Visible to free users, unlocked on Premium. Add motivational copy tailored to each habit."
                  bullets={[
                    "Personal message for each habit",
                    "Works with scheduled reminders",
                  ]}
                  onPress={() => navigation.getParent()?.navigate("Premium")}
                />
              )}
            </>
          ) : null}
        </Card>

        <Card style={styles.previewCard}>
          <View style={styles.previewRow}>
            <Icon
              name={selectedCategoryMeta?.icon || "target"}
              size={22}
              color="#4f46e5"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.previewTitle}>
                {habitName || "Your new habit"}
              </Text>
              <Text style={styles.previewText}>
                {description ||
                  "Describe what success looks like in one sentence."}
              </Text>
            </View>
          </View>
          <View style={styles.chipWrap}>
            <Chip style={styles.previewChip}>{scheduleType}</Chip>
            <Chip style={styles.previewChip}>{estimatedTime}</Chip>
            <Chip style={styles.previewChip}>Difficulty {difficulty}</Chip>
          </View>
        </Card>

        <Button
          mode="contained"
          onPress={saveHabit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.saveButton}
        >
          Create habit
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const TouchableSchedule = ({
  label,
  description,
  selected,
  locked,
  onPress,
}) => (
  <Card
    style={[
      styles.scheduleCard,
      selected && styles.scheduleCardSelected,
      locked && styles.lockedCard,
    ]}
    onPress={onPress}
  >
    <View style={styles.rowBetween}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.scheduleTitle}>{label}</Text>
        <Text style={styles.scheduleDescription}>{description}</Text>
      </View>
      <Icon
        name={
          locked ? "lock-outline" : selected ? "check-circle" : "circle-outline"
        }
        size={22}
        color={locked ? "#7c3aed" : "#4f46e5"}
      />
    </View>
  </Card>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 32 },
  sectionSpacing: { marginBottom: 12 },
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  previewCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    backgroundColor: "#eef2ff",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6b7280",
    marginBottom: 12,
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
  difficultyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  templateRow: { gap: 12, paddingRight: 8 },
  templateCard: {
    width: 220,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#f8fafc",
  },
  lockedCard: { backgroundColor: "#faf5ff" },
  templateChip: {
    alignSelf: "flex-start",
    marginBottom: 10,
    backgroundColor: "#eef2ff",
  },
  templateTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  templateDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#4b5563",
    marginTop: 8,
    marginBottom: 12,
  },
  scheduleList: { gap: 10 },
  scheduleCard: { borderRadius: 18, padding: 14, backgroundColor: "#f8fafc" },
  scheduleCardSelected: {
    borderWidth: 1,
    borderColor: "#4f46e5",
    backgroundColor: "#eef2ff",
  },
  scheduleTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  scheduleDescription: { marginTop: 4, fontSize: 13, color: "#6b7280" },
  dayWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  dayChip: { marginBottom: 8 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeButton: { alignSelf: "flex-start", marginBottom: 12 },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  previewTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  previewText: { fontSize: 13, lineHeight: 19, color: "#4b5563", marginTop: 4 },
  previewChip: { backgroundColor: "#ffffff" },
  saveButton: { borderRadius: 16, paddingVertical: 6 },
});

export default CreateHabitScreen;
