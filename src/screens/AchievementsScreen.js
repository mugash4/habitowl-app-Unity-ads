import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Appbar, Button, Card, Chip, ProgressBar } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import FirebaseService from "../services/FirebaseService";
import AdMobBanner from "../components/AdMobBanner";
import OfflineAdCard from "../components/OfflineAdCard";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { getAchievementProgress } from "../utils/habitHelpers";

const AchievementsScreen = ({ navigation }) => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const { totalHeight: tabBarTotalHeight } = useTabBarHeight();

  const loadAchievements = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = await FirebaseService.getCachedHabits();
        if (cached?.length) {
          setHabits(cached);
          setLoading(false);
        }
      }

      const [userHabits, stats] = await Promise.all([
        FirebaseService.getUserHabits(forceRefresh),
        FirebaseService.getUserStats(),
      ]);

      let adminStatus = false;
      const currentUser = FirebaseService.currentUser;
      if (currentUser?.email) {
        const AdminService = require("../services/AdminService").default;
        adminStatus = await AdminService.checkAdminStatus(currentUser.email);
      }

      setHabits(userHabits || []);
      setIsPremium(!!stats?.isPremium || adminStatus);
      setIsAdmin(adminStatus);
      setIsOffline(false);
    } catch (error) {
      console.error("Achievements load error:", error);
      setIsOffline(true);
      const fallback = await FirebaseService.getCachedHabits();
      setHabits(fallback || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  useFocusEffect(
    useCallback(() => {
      loadAchievements();
    }, [loadAchievements]),
  );

  const achievementProgress = useMemo(
    () => getAchievementProgress(habits),
    [habits],
  );

  const completionPercent = achievementProgress.totalCount
    ? achievementProgress.earnedCount / achievementProgress.totalCount
    : 0;

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title="Achievements"
          subtitle="Badges earned from real habit progress"
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarTotalHeight + 60 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAchievements(true);
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryEyebrow}>Progress</Text>
              <Text style={styles.summaryTitle}>
                {achievementProgress.earnedCount}/
                {achievementProgress.totalCount} badges unlocked
              </Text>
            </View>
            <View style={styles.summaryIconWrap}>
              <Icon name="medal-outline" size={28} color="#f59e0b" />
            </View>
          </View>

          <ProgressBar
            progress={completionPercent}
            color="#4f46e5"
            style={styles.progressBar}
          />

          <View style={styles.metricsRow}>
            <View style={styles.metricPill}>
              <Icon name="check-all" size={16} color="#10b981" />
              <Text style={styles.metricText}>
                {achievementProgress.metrics.totalCompletions} completions
              </Text>
            </View>
            <View style={styles.metricPill}>
              <Icon name="fire" size={16} color="#ef4444" />
              <Text style={styles.metricText}>
                Best streak {achievementProgress.metrics.bestStreak}
              </Text>
            </View>
          </View>
        </Card>

        {!isPremium && !isAdmin && !isOffline ? (
          <View style={styles.sectionSpacing}>
            <AdMobBanner />
          </View>
        ) : null}

        {!isPremium && !isAdmin && isOffline ? (
          <View style={styles.sectionSpacing}>
            <OfflineAdCard message="Achievements still update offline. Ads will resume when the connection returns." />
          </View>
        ) : null}

        {achievementProgress.achievements.map((achievement) => (
          <Card
            key={achievement.id}
            style={[
              styles.achievementCard,
              achievement.earned && styles.achievementCardEarned,
            ]}
          >
            <View style={styles.achievementRow}>
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: `${achievement.color}18` },
                ]}
              >
                <Icon
                  name={achievement.icon}
                  size={24}
                  color={achievement.earned ? achievement.color : "#9ca3af"}
                />
              </View>

              <View style={styles.achievementTextWrap}>
                <View style={styles.titleRow}>
                  <Text style={styles.achievementTitle}>
                    {achievement.title}
                  </Text>
                  <Chip
                    compact
                    style={
                      achievement.earned ? styles.earnedChip : styles.lockedChip
                    }
                    textStyle={
                      achievement.earned
                        ? styles.earnedChipText
                        : styles.lockedChipText
                    }
                  >
                    {achievement.earned ? "Earned" : "Locked"}
                  </Chip>
                </View>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
                <Text style={styles.requirementText}>
                  Requirement: {achievement.requirementText}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {!loading && achievementProgress.earnedCount === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="trophy-outline" size={28} color="#4f46e5" />
            <Text style={styles.emptyTitle}>No badges yet</Text>
            <Text style={styles.emptyText}>
              The first badges unlock quickly. Complete a habit and come back
              here.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate("Home")}
              style={styles.emptyButton}
            >
              Back to habits
            </Button>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#f8fafc" },
  content: { padding: 16 },
  sectionSpacing: { marginBottom: 16 },
  summaryCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryTitle: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  summaryIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff7ed",
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    marginTop: 16,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f8fafc",
  },
  metricText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  achievementCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#ffffff",
    marginBottom: 14,
  },
  achievementCardEarned: {
    borderWidth: 1,
    borderColor: "#c7d2fe",
    backgroundColor: "#f8faff",
  },
  achievementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  badgeIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  achievementTextWrap: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  achievementTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  achievementDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  requirementText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  earnedChip: { backgroundColor: "#dcfce7" },
  earnedChipText: { color: "#166534", fontSize: 11, fontWeight: "700" },
  lockedChip: { backgroundColor: "#f3f4f6" },
  lockedChipText: { color: "#6b7280", fontSize: 11, fontWeight: "700" },
  emptyCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: "#ffffff",
    alignItems: "center",
    marginTop: 8,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    textAlign: "center",
  },
  emptyButton: { marginTop: 16, borderRadius: 14 },
});

export default AchievementsScreen;
