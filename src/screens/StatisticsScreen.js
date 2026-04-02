import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Appbar, Button, Card, Chip } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import FirebaseService from "../services/FirebaseService";
import TipsService from "../services/TipsService";
import AdMobBanner from "../components/AdMobBanner";
import TipCard from "../components/TipCard";
import PremiumFeatureCard from "../components/PremiumFeatureCard";
import OfflineAdCard from "../components/OfflineAdCard";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import {
  getLastNDaysSeries,
  getCategoryBreakdown,
  getHeatmapData,
  getBestCompletionDay,
  getTodayProgress,
  isHabitDueOnDate,
} from "../utils/habitHelpers";
import adMobService from "../services/AdMobService";

const StatisticsScreen = ({ navigation }) => {
  const [habits, setHabits] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const { totalHeight: tabBarTotalHeight } = useTabBarHeight();

  const loadStats = useCallback(async (forceRefresh = false) => {
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
      setUserStats(stats);
      setIsPremium(!!stats?.isPremium || adminStatus);
      setIsAdmin(adminStatus);
      setIsOffline(false);
    } catch (error) {
      console.error("Statistics load error:", error);
      setIsOffline(true);
      const fallback = await FirebaseService.getCachedHabits();
      setHabits(fallback || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    TipsService.hasSeenGuide("statistics_overview").then((seen) =>
      setShowGuide(!seen),
    );
  }, [loadStats]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const todayProgress = useMemo(() => getTodayProgress(habits), [habits]);
  const bestStreak = useMemo(
    () =>
      habits.reduce(
        (best, habit) => Math.max(best, habit.longestStreak || 0),
        0,
      ),
    [habits],
  );
  const totalCompletions = useMemo(
    () => habits.reduce((sum, habit) => sum + (habit.totalCompletions || 0), 0),
    [habits],
  );
  const sevenDaySeries = useMemo(() => getLastNDaysSeries(habits, 7), [habits]);
  const heatmap = useMemo(() => getHeatmapData(habits, 56), [habits]);
  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(habits),
    [habits],
  );
  const bestDay = useMemo(() => getBestCompletionDay(habits), [habits]);

  const consistencyScore = useMemo(() => {
    if (!habits.length) return 0;
    const totalDueInstances = habits.reduce((total, habit) => {
      let dueCount = 0;
      for (let i = 0; i < 28; i += 1) {
        const candidate = new Date();
        candidate.setDate(candidate.getDate() - i);
        if (isHabitDueOnDate(habit, candidate)) {
          dueCount += 1;
        }
      }
      return total + dueCount;
    }, 0);

    const completedInstances = habits.reduce((total, habit) => {
      const completions = (habit.completions || []).filter((dateKey) => {
        const date = new Date(dateKey);
        const last28 = new Date();
        last28.setDate(last28.getDate() - 27);
        return date >= last28;
      }).length;
      return total + completions;
    }, 0);

    return totalDueInstances
      ? Math.round((completedInstances / totalDueInstances) * 100)
      : 0;
  }, [habits]);

  const heatmapColumns = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < heatmap.length; i += 7) {
      weeks.push(heatmap.slice(i, i + 7));
    }
    return weeks;
  }, [heatmap]);

  const categoryEntries = Object.entries(categoryBreakdown).sort(
    (a, b) => b[1] - a[1],
  );
  const topCategory = categoryEntries[0]?.[0] || "No category yet";

  const renderOverviewCard = (icon, label, value, tint) => (
    <Card style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${tint}18` }]}>
        <Icon name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Statistics" subtitle="Your habits at a glance" />
        <Appbar.Action
          icon="crown-outline"
          onPress={() => navigation.getParent()?.navigate("Premium")}
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarTotalHeight + 70 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadStats(true);
              if (!isPremium && !isAdmin) {
                await adMobService.showInterstitialAd("statistics_refresh");
              }
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {showGuide ? (
          <TipCard
            title="How to read this screen"
            description="The top cards answer 'how am I doing now?', the review section explains patterns, and Premium reveals deeper breakdowns without hiding the upgrade path."
            onDismiss={async () => {
              await TipsService.markGuideSeen("statistics_overview");
              setShowGuide(false);
            }}
            onStopTips={async () => {
              await TipsService.setTipsEnabled(false);
              setShowGuide(false);
            }}
            style={styles.sectionSpacing}
          />
        ) : null}

        <View style={styles.metricsGrid}>
          {renderOverviewCard(
            "check-circle-outline",
            "Total completions",
            totalCompletions,
            "#4f46e5",
          )}
          {renderOverviewCard(
            "calendar-check-outline",
            "Due today",
            todayProgress.dueToday,
            "#10b981",
          )}
          {renderOverviewCard(
            "chart-line",
            "Consistency score",
            `${consistencyScore}%`,
            "#f59e0b",
          )}
          {renderOverviewCard("fire", "Best streak", bestStreak, "#ef4444")}
        </View>

        {!isPremium && !isAdmin && !isOffline ? (
          <View style={styles.sectionSpacing}>
            <AdMobBanner />
          </View>
        ) : null}
        {!isPremium && !isAdmin && isOffline ? (
          <View style={styles.sectionSpacing}>
            <OfflineAdCard />
          </View>
        ) : null}

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly review</Text>
            <Chip compact style={styles.sectionChip}>
              Auto readable
            </Chip>
          </View>
          <View style={styles.reviewGrid}>
            <View style={styles.reviewTile}>
              <Text style={styles.reviewLabel}>Best day</Text>
              <Text style={styles.reviewValue}>{bestDay}</Text>
            </View>
            <View style={styles.reviewTile}>
              <Text style={styles.reviewLabel}>Most used category</Text>
              <Text style={styles.reviewValue}>{topCategory}</Text>
            </View>
            <View style={styles.reviewTile}>
              <Text style={styles.reviewLabel}>Today completion</Text>
              <Text style={styles.reviewValue}>{todayProgress.percent}%</Text>
            </View>
            <View style={styles.reviewTile}>
              <Text style={styles.reviewLabel}>Active habits</Text>
              <Text style={styles.reviewValue}>{habits.length}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Last 7 days</Text>
            <Text style={styles.sectionDescription}>
              Simple bars instead of cramped charts.
            </Text>
          </View>
          <View style={styles.barChartWrap}>
            {sevenDaySeries.values.map((value, index) => {
              const maxValue = Math.max(...sevenDaySeries.values, 1);
              const heightPercent = `${Math.max(10, (value / maxValue) * 100)}%`;
              return (
                <View
                  key={`${sevenDaySeries.labels[index]}_${index}`}
                  style={styles.barItem}
                >
                  <Text style={styles.barValue}>{value}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: heightPercent }]} />
                  </View>
                  <Text style={styles.barLabel}>
                    {sevenDaySeries.labels[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {!isPremium && !isAdmin ? (
          <PremiumFeatureCard
            title="Advanced insights stay visible"
            description="Free users can preview what Premium unlocks: category distribution, stronger weekly review suggestions, and deeper trend summaries."
            bullets={[
              "Category breakdown and comparisons",
              "Premium-only smart review cards",
              "Ad-free analytics screen",
            ]}
            onPress={() => navigation.getParent()?.navigate("Premium")}
            style={styles.sectionSpacing}
          />
        ) : (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Category breakdown</Text>
              <Chip compact style={styles.sectionChip}>
                Premium
              </Chip>
            </View>
            {categoryEntries.length === 0 ? (
              <Text style={styles.sectionDescription}>
                No category data yet.
              </Text>
            ) : (
              categoryEntries.map(([category, count]) => {
                const total = habits.length || 1;
                const width = `${Math.max(12, (count / total) * 100)}%`;
                return (
                  <View key={category} style={styles.categoryRow}>
                    <View style={styles.categoryTextWrap}>
                      <Text style={styles.categoryName}>{category}</Text>
                      <Text style={styles.categoryValue}>{count} habits</Text>
                    </View>
                    <View style={styles.categoryTrack}>
                      <View style={[styles.categoryFill, { width }]} />
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        )}

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Consistency heatmap</Text>
            <Text style={styles.sectionDescription}>56 days of activity.</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.heatmapRow}>
              {heatmapColumns.map((week, weekIndex) => (
                <View key={`week_${weekIndex}`} style={styles.heatmapWeek}>
                  {week.map((cell) => (
                    <View
                      key={cell.key}
                      style={[
                        styles.heatmapCell,
                        cell.intensity === 0 && styles.heatmap0,
                        cell.intensity === 1 && styles.heatmap1,
                        cell.intensity === 2 && styles.heatmap2,
                        cell.intensity === 3 && styles.heatmap3,
                        cell.intensity >= 4 && styles.heatmap4,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.legendRow}>
            <Text style={styles.legendText}>Less</Text>
            {[0, 1, 2, 3, 4].map((level) => (
              <View
                key={level}
                style={[
                  styles.legendDot,
                  level === 0 && styles.heatmap0,
                  level === 1 && styles.heatmap1,
                  level === 2 && styles.heatmap2,
                  level === 3 && styles.heatmap3,
                  level === 4 && styles.heatmap4,
                ]}
              />
            ))}
            <Text style={styles.legendText}>More</Text>
          </View>
        </Card>

        <Button
          mode="contained-tonal"
          onPress={() => navigation.navigate("Settings")}
        >
          Manage tips, reminders, and rate prompt
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#f8fafc" },
  content: { padding: 16 },
  sectionSpacing: { marginBottom: 16 },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: "47%",
    minWidth: 150,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  metricValue: { fontSize: 22, fontWeight: "800", color: "#111827" },
  metricLabel: { marginTop: 6, fontSize: 13, color: "#6b7280", lineHeight: 19 },
  sectionCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: "#111827" },
  sectionDescription: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 19,
  },
  sectionChip: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#eef2ff",
  },
  reviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  reviewTile: {
    width: "47%",
    minWidth: 150,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
  },
  reviewLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  reviewValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  barChartWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 180,
  },
  barItem: { flex: 1, alignItems: "center" },
  barValue: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  barTrack: {
    width: 22,
    height: 110,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#4f46e5",
  },
  barLabel: { marginTop: 8, fontSize: 12, color: "#374151", fontWeight: "700" },
  categoryRow: { marginBottom: 12 },
  categoryTextWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textTransform: "capitalize",
  },
  categoryValue: { fontSize: 12, color: "#6b7280" },
  categoryTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  categoryFill: {
    height: "100%",
    backgroundColor: "#7c3aed",
    borderRadius: 999,
  },
  heatmapRow: { flexDirection: "row", gap: 6 },
  heatmapWeek: { gap: 6 },
  heatmapCell: { width: 18, height: 18, borderRadius: 5 },
  heatmap0: { backgroundColor: "#e5e7eb" },
  heatmap1: { backgroundColor: "#c7d2fe" },
  heatmap2: { backgroundColor: "#a5b4fc" },
  heatmap3: { backgroundColor: "#818cf8" },
  heatmap4: { backgroundColor: "#4f46e5" },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  legendText: { fontSize: 12, color: "#6b7280" },
  legendDot: { width: 14, height: 14, borderRadius: 4 },
});

export default StatisticsScreen;
