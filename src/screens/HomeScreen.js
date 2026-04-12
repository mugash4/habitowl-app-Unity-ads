import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { Appbar, Button, Card, Chip, FAB, Searchbar } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import HabitCard from "../components/HabitCard";
import AdMobBanner from "../components/AdMobBanner";
import TipCard from "../components/TipCard";
import PremiumFeatureCard from "../components/PremiumFeatureCard";
import CelebrationModal from "../components/CelebrationModal";
import OfflineAdCard from "../components/OfflineAdCard";
import FirebaseService from "../services/FirebaseService";
import NotificationService from "../services/NotificationService";
import TipsService from "../services/TipsService";
import RateAppService from "../services/RateAppService";
import HabitTemplateService from "../services/HabitTemplateService";
import adMobService from "../services/AdMobService";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import {
  sortHabitsForDashboard,
  getTodayProgress,
  getSuccessMessageForStreak,
  isHabitDueOnDate,
  getAchievementProgress,
  getEarnedAchievements,
} from "../utils/habitHelpers";

const FREE_HABIT_LIMIT = 5;

const HomeScreen = ({ navigation }) => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showTemplateTip, setShowTemplateTip] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState(null);
  const [celebration, setCelebration] = useState({
    visible: false,
    title: "",
    subtitle: "",
    badge: "",
  });

  const { totalHeight: tabBarTotalHeight } = useTabBarHeight();

  const templates = HabitTemplateService.getTemplates();

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    let sortedHabits = [];

    try {
      if (!forceRefresh) {
        const cached = await FirebaseService.getCachedHabits();
        if (cached?.length) {
          sortedHabits = sortHabitsForDashboard(cached);
          setHabits(sortedHabits);
          setLoading(false);
        }
      }

      const [userHabits, userStats] = await Promise.all([
        FirebaseService.getUserHabits(forceRefresh),
        FirebaseService.getUserStats(),
      ]);

      let adminStatus = false;
      const currentUser = FirebaseService.currentUser;
      if (currentUser?.email) {
        const AdminService = require("../services/AdminService").default;
        adminStatus = await AdminService.checkAdminStatus(currentUser.email);
      }

      sortedHabits = sortHabitsForDashboard(userHabits || []);
      setHabits(sortedHabits);
      setIsPremium(!!userStats?.isPremium || adminStatus);
      setIsAdmin(adminStatus);
      setIsOffline(false);
      return sortedHabits;
    } catch (error) {
      console.error("Home load error:", error);
      setIsOffline(true);
      const fallback = await FirebaseService.getCachedHabits();
      sortedHabits = sortHabitsForDashboard(fallback || []);
      setHabits(sortedHabits);
      return sortedHabits;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const openCreateHabitScreen = useCallback(() => {
    const parentNavigation = navigation.getParent?.();
    if (parentNavigation?.navigate) {
      parentNavigation.navigate("CreateHabit");
      return;
    }
    navigation.navigate("CreateHabit");
  }, [navigation]);

  const loadTips = useCallback(async () => {
    const [seenHomeGuide, showTemplatesTip] = await Promise.all([
      TipsService.hasSeenGuide("home_overview"),
      TipsService.shouldShowTip("home_templates"),
    ]);
    setShowGuide(!seenHomeGuide);
    setShowTemplateTip(showTemplatesTip);
  }, []);

  useEffect(() => {
    loadDashboard();
    loadTips();
  }, [loadDashboard, loadTips]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const filteredHabits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return habits;
    return habits.filter((habit) => {
      const haystack =
        `${habit.name} ${habit.description || ""} ${habit.category || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [habits, searchQuery]);

  const dueTodayHabits = useMemo(
    () => filteredHabits.filter((habit) => isHabitDueOnDate(habit)),
    [filteredHabits],
  );
  const laterHabits = useMemo(
    () => filteredHabits.filter((habit) => !isHabitDueOnDate(habit)),
    [filteredHabits],
  );
  const todayProgress = useMemo(() => getTodayProgress(habits), [habits]);
  const completedTodayCount = dueTodayHabits.filter((habit) =>
    (habit.completions || []).includes(new Date().toDateString()),
  ).length;
  const bestStreak = habits.reduce(
    (best, habit) => Math.max(best, habit.longestStreak || 0),
    0,
  );
  const achievementProgress = useMemo(
    () => getAchievementProgress(habits),
    [habits],
  );

  const handleStopTips = async () => {
    await TipsService.setTipsEnabled(false);
    setShowGuide(false);
    setShowTemplateTip(false);
  };

  const handleDismissHomeGuide = async () => {
    await TipsService.markGuideSeen("home_overview");
    setShowGuide(false);
  };

  const openPremium = () => {
    navigation.getParent()?.navigate("Premium");
  };

  const openAchievements = () => {
    navigation.getParent()?.navigate("Achievements");
  };

  const showFreePlanLimitPrompt = (count = FREE_HABIT_LIMIT) => {
    Alert.alert(
      "Free plan limit reached",
      `You already have ${count} active habits. Upgrade to Premium to create unlimited habits and remove ads.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "See Premium", onPress: openPremium },
      ],
    );
  };

  const handleCreateHabit = () => {
    openCreateHabitScreen();
  };

  const handleCreateFromTemplate = async (template) => {
    if (pendingTemplateId) return;

    if (template.premiumOnly && !isPremium && !isAdmin) {
      Alert.alert(
        "Premium template",
        `${template.title} is visible to free users so they can preview it. Upgrade to add it instantly.`,
      );
      return openPremium();
    }

    if (!isPremium && !isAdmin && habits.length >= FREE_HABIT_LIMIT) {
      showFreePlanLimitPrompt(habits.length);
      return;
    }

    const habitData = {
      name: template.title,
      description: template.description,
      category: template.category,
      difficulty: template.difficulty,
      estimatedTime: template.estimatedTime,
      scheduleType: template.scheduleType,
      selectedDays: template.selectedDays || [],
      weeklyTarget: template.weeklyTarget || 3,
      cue: template.cue || "",
      location: template.location || "",
      reward: template.reward || "",
      reminderEnabled: false,
      reminderTime: null,
      reminderMessage: null,
      templateId: template.id,
      isPremiumTemplate: !!template.premiumOnly,
    };

    try {
      setPendingTemplateId(template.id);
      const newHabit = await FirebaseService.createHabit(habitData);
      setHabits((current) =>
        sortHabitsForDashboard([
          newHabit,
          ...current.filter((habit) => habit.id !== newHabit.id),
        ]),
      );
      setSearchQuery("");
      setIsOffline(false);

      FirebaseService.trackEvent("template_created", {
        templateId: template.id,
        premium: !!template.premiumOnly,
      }).catch(() => {});
      RateAppService.trackPositiveMoment(1).catch(() => {});
      adMobService.showInterstitialAd("template_created").catch(() => {});
      loadDashboard().catch(() => {});
    } catch (error) {
      if (error.message?.toLowerCase().includes("free plan")) {
        showFreePlanLimitPrompt(habits.length);
        return;
      }
      Alert.alert(
        "Could not add template",
        error.message || "Please try again.",
      );
    } finally {
      setPendingTemplateId(null);
    }
  };


const handleDeleteHabit = async (habitId) => {
    const previousHabits = habits;
    setHabits((current) => current.filter((habit) => habit.id !== habitId));

    try {
      await FirebaseService.deleteHabit(habitId);
      NotificationService.cancelHabitNotifications(habitId).catch(() => {});
      adMobService.showInterstitialAd("habit_deleted").catch(() => {});
      loadDashboard().catch(() => {});
    } catch (error) {
      setHabits(previousHabits);
      Alert.alert("Delete failed", error.message || "Please try again.");
    }
  };

  const buildUpdatedHabitFromResult = (habit, nextCompleted, result = {}) => {
    if (result?.updatedHabit) {
      return result.updatedHabit;
    }

    const todayKey = new Date().toDateString();
    const currentCompletions = Array.isArray(habit.completions)
      ? habit.completions
      : [];
    const nextCompletions = nextCompleted
      ? currentCompletions.includes(todayKey)
        ? currentCompletions
        : [...currentCompletions, todayKey]
      : currentCompletions.filter((dateKey) => dateKey !== todayKey);

    const fallbackStreak = nextCompleted
      ? Math.max((habit.currentStreak || 0) + 1, 1)
      : Math.max((habit.currentStreak || 0) - 1, 0);
    const nextStreak = result?.newStreak ?? fallbackStreak;
    const nextLongestStreak =
      result?.newLongestStreak ??
      Math.max(habit.longestStreak || 0, nextStreak);

    return {
      ...habit,
      completions: nextCompletions,
      currentStreak: nextStreak,
      longestStreak: nextLongestStreak,
      totalCompletions: nextCompleted
        ? (habit.totalCompletions || 0) + 1
        : Math.max(0, (habit.totalCompletions || 0) - 1),
      lastCompletedAt: nextCompleted
        ? new Date().toISOString()
        : habit.lastCompletedAt || null,
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    };
  };

  const handleHabitComplete = async (habit, nextCompleted, result = {}) => {
    const previousAchievementIds = new Set(
      getEarnedAchievements(habits).map((item) => item.id),
    );
    const updatedHabit = buildUpdatedHabitFromResult(
      habit,
      nextCompleted,
      result,
    );
    const updatedHabits = sortHabitsForDashboard(
      habits.map((currentHabit) =>
        currentHabit.id === updatedHabit.id ? updatedHabit : currentHabit,
      ),
    );

    setHabits(updatedHabits);

    if (!nextCompleted) {
      return;
    }

    const newAchievements = getEarnedAchievements(updatedHabits).filter(
      (item) => !previousAchievementIds.has(item.id),
    );
    const newStreak = updatedHabit.currentStreak || result?.newStreak || 0;
    const milestones = [3, 7, 14, 30, 60, 100, 365];
    const progress = getTodayProgress(updatedHabits);

    if (newAchievements.length > 0) {
      const unlocked = newAchievements[0];
      setCelebration({
        visible: true,
        title: `${unlocked.title} unlocked!`,
        subtitle: unlocked.description,
        badge: "Achievement earned",
      });
      await RateAppService.trackPositiveMoment(2);
    } else if (milestones.includes(newStreak)) {
      NotificationService.scheduleStreakCelebration(updatedHabit, newStreak).catch(
        () => {},
      );
      setCelebration({
        visible: true,
        title: `${updatedHabit.name} milestone!`,
        subtitle: getSuccessMessageForStreak(newStreak),
        badge: `${newStreak} streak`,
      });
      await RateAppService.trackPositiveMoment(2);
    } else if (
      progress.dueToday > 0 &&
      progress.completedToday === progress.dueToday
    ) {
      setCelebration({
        visible: true,
        title: "Today complete 🎯",
        subtitle:
          "You finished every habit scheduled for today. Great job keeping the day clean and simple.",
        badge: "All due habits done",
      });
      await RateAppService.trackPositiveMoment(2);
    } else {
      await RateAppService.trackPositiveMoment(1);
    }

    RateAppService.promptIfEligible().catch(() => {});
    adMobService.showInterstitialAd("habit_completed").catch(() => {});
  };


  const renderTopBanner = (placementKey) => {
    if (isPremium || isAdmin) return null;
    if (isOffline) {
      return (
        <View key={`${placementKey}_offline`} style={styles.section}>
          <OfflineAdCard message="You can keep using HabitOwl fully offline. Ad placements for free users will fill again when the connection returns." />
        </View>
      );
    }

    return (
      <View key={`${placementKey}_banner`} style={styles.section}>
        <AdMobBanner />
      </View>
    );
  };

  const renderHabitCardsWithAds = (habitList, sectionKey) => {
    const rows = [];

    habitList.forEach((habit, index) => {
      rows.push(
        <HabitCard
          key={habit.id}
          habit={habit}
          isCompleted={(habit.completions || []).includes(
            new Date().toDateString(),
          )}
          onComplete={handleHabitComplete}
          onEdit={(selectedHabit) =>
            navigation
              .getParent()
              ?.navigate("EditHabit", { habit: selectedHabit })
          }
          onDelete={handleDeleteHabit}
        />,
      );

      const shouldShowInlineBanner =
        !isPremium &&
        !isAdmin &&
        !isOffline &&
        index < habitList.length - 1 &&
        (index + 1) % 2 === 0;

      if (shouldShowInlineBanner) {
        rows.push(
          <View
            key={`inline_ad_${sectionKey}_${habit.id}`}
            style={styles.inlineAdWrap}
          >
            <AdMobBanner />
          </View>,
        );
      }
    });

    return rows;
  };

  const renderTemplates = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Starter packs</Text>
        <View style={styles.sectionHeaderActions}>
          <Button mode="contained-tonal" compact onPress={handleCreateHabit}>
            Custom habit
          </Button>
          <Chip compact icon="wand-sparkles" style={styles.sectionChip}>
            One tap
          </Chip>
        </View>
      </View>


      {showTemplateTip ? (
        <TipCard
          title="Start faster with templates"
          description="Use these proven starter packs when you want a habit that feels realistic from day one."
          onDismiss={async () => {
            await TipsService.dismissTip("home_templates");
            setShowTemplateTip(false);
          }}
          onStopTips={handleStopTips}
          style={styles.tipSpacing}
        />
      ) : null}

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
              style={[styles.templateCard, locked && styles.templateCardLocked]}
            >
              <View style={styles.templateBadgeRow}>
                <Chip
                  compact
                  style={styles.smallChip}
                  textStyle={styles.smallChipText}
                >
                  {template.category}
                </Chip>
                {locked ? (
                  <Chip
                    compact
                    icon="lock-outline"
                    style={styles.lockedChip}
                    textStyle={styles.lockedChipText}
                  >
                    Premium
                  </Chip>
                ) : null}
              </View>
              <Text style={styles.templateTitle}>{template.title}</Text>
              <Text style={styles.templateDescription}>
                {template.description}
              </Text>
              <View style={styles.templateMeta}>
                <Icon name="clock-outline" size={14} color="#6b7280" />
                <Text style={styles.templateMetaText}>
                  {template.estimatedTime}
                </Text>
              </View>
              <Button
                mode={locked ? "contained-tonal" : "contained"}
                onPress={() => handleCreateFromTemplate(template)}
                loading={pendingTemplateId === template.id}
                disabled={!!pendingTemplateId}
              >
                {locked ? "Unlock" : pendingTemplateId === template.id ? "Adding" : "Add"}
              </Button>

            </Card>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="HabitOwl" subtitle="Your daily momentum" />
        <Appbar.Action icon="medal-outline" onPress={openAchievements} />
        <Appbar.Action icon="crown-outline" onPress={openPremium} />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarTotalHeight + 90 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDashboard(true);
            }}
          />
        }
      >
        <LinearGradient colors={["#4f46e5", "#7c3aed"]} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>Today</Text>
              <Text style={styles.heroTitle}>
                {todayProgress.completedToday}/{todayProgress.dueToday || 0}{" "}
                habits complete
              </Text>
              <Text style={styles.heroSubtitle}>
                {todayProgress.percent === 100 && todayProgress.dueToday > 0
                  ? "You cleared everything due today."
                  : "Keep the next step obvious and small."}
              </Text>
            </View>
            <View style={styles.heroCircle}>
              <Text style={styles.heroCircleText}>
                {todayProgress.percent}%
              </Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatPill}>
              <Icon name="check-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.heroStatText}>
                {completedTodayCount} completed
              </Text>
            </View>
            <View style={styles.heroStatPill}>
              <Icon name="fire" size={16} color="#ffffff" />
              <Text style={styles.heroStatText}>Best streak {bestStreak}</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Icon name="medal-outline" size={16} color="#ffffff" />
              <Text style={styles.heroStatText}>
                {achievementProgress.earnedCount}/
                {achievementProgress.totalCount} badges
              </Text>
            </View>
          </View>
        </LinearGradient>

        {renderTopBanner("home_top")}

        {showGuide ? (
          <TipCard
            title="Welcome to your habit dashboard"
            description="Use this screen to focus on what is due today first. Later habits stay visible below so users can plan ahead without clutter."
            actionLabel="Create habit"
            onAction={handleCreateHabit}
            onDismiss={handleDismissHomeGuide}
            onStopTips={handleStopTips}
            style={styles.tipSpacing}
          />
        ) : null}

        <Searchbar
          placeholder="Search habits"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />

        {!isPremium && !isAdmin ? (
          <PremiumFeatureCard
            title="Premium stays visible"
            description="Free users can preview advanced features before upgrading. Premium removes all ads and unlocks deeper scheduling + analytics."
            bullets={[
              "Unlimited habits",
              "AI coaching with unlimited daily use",
              "Premium templates and weekly insights",
            ]}
            onPress={openPremium}
            style={styles.section}
          />
        ) : null}

        <Card style={styles.achievementCard}>
          <View style={styles.achievementHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.achievementCardTitle}>Achievements</Text>
              <Text style={styles.achievementCardText}>
                Unlock badges from real streaks, completions, and consistency.
              </Text>
            </View>
            <Button mode="contained-tonal" onPress={openAchievements}>
              View
            </Button>
          </View>
        </Card>

        {renderTemplates()}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Due today</Text>
            <Chip compact icon="calendar-today" style={styles.sectionChip}>
              {dueTodayHabits.length}
            </Chip>
          </View>

          {loading ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Loading your habits…</Text>
            </Card>
          ) : dueTodayHabits.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Icon name="weather-night" size={26} color="#6366f1" />
              <Text style={styles.emptyTitle}>Nothing due right now</Text>
              <Text style={styles.emptyText}>
                Create a habit or browse a starter pack to add something useful.
              </Text>
              <Button
                mode="contained"
                style={styles.emptyButton}
                onPress={handleCreateHabit}
              >
                Create habit
              </Button>
            </Card>
          ) : (
            renderHabitCardsWithAds(dueTodayHabits, "due_today")
          )}
        </View>

        {laterHabits.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Scheduled later</Text>
              <Chip compact icon="calendar-clock" style={styles.sectionChip}>
                {laterHabits.length}
              </Chip>
            </View>
            {renderHabitCardsWithAds(laterHabits, "later")}
          </View>
        ) : null}
      </ScrollView>

      <FAB icon="plus" style={styles.fab} onPress={handleCreateHabit} />

      <CelebrationModal
        visible={celebration.visible}
        title={celebration.title}
        subtitle={celebration.subtitle}
        badge={celebration.badge}
        onClose={() =>
          setCelebration({ visible: false, title: "", subtitle: "", badge: "" })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    minHeight: 170,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    color: "#ffffff",
    flexShrink: 1,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.92)",
    flexShrink: 1,
  },
  heroCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  heroCircleText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  heroStatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroStatText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  searchBar: {
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  searchInput: {
    minHeight: 42,
  },
  section: {
    marginTop: 8,
    marginBottom: 8,
  },
  inlineAdWrap: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  sectionChip: {
    backgroundColor: "#eef2ff",
  },
  tipSpacing: {
    marginBottom: 12,
  },
  achievementCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#ffffff",
    marginBottom: 12,
  },
  achievementHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  achievementCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  achievementCardText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#6b7280",
  },
  templateRow: {
    paddingRight: 8,
    gap: 12,
  },
  templateCard: {
    width: 260,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  templateCardLocked: {
    backgroundColor: "#faf5ff",
  },
  templateBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  smallChip: {
    backgroundColor: "#eef2ff",
  },
  smallChipText: {
    color: "#4338ca",
    fontSize: 11,
    fontWeight: "700",
  },
  lockedChip: {
    backgroundColor: "#f3e8ff",
  },
  lockedChipText: {
    color: "#7c3aed",
    fontSize: 11,
    fontWeight: "700",
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  templateDescription: {
    marginTop: 8,
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 19,
    minHeight: 54,
  },
  templateMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 14,
  },
  templateMetaText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  emptyCard: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 14,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 26,
    backgroundColor: "#4f46e5",
  },
});

export default HomeScreen;
