import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Card, Appbar, Chip, Button } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import FirebaseService from '../services/FirebaseService';
import AdBanner from '../components/AdBanner';
import AdService from '../services/AdService';

const { width: screenWidth } = Dimensions.get('window');

const StatisticsScreen = ({ navigation }) => {
  const [habits, setHabits] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const [userHabits, stats] = await Promise.all([
        FirebaseService.getUserHabits(),
        FirebaseService.getUserStats()
      ]);
      
      setHabits(userHabits);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
    
    // Show interstitial ad occasionally after viewing stats
    const shouldShowAd = await AdService.shouldShowInterstitialAfterAction('stats_view');
    if (shouldShowAd) {
      setTimeout(() => {
        AdService.showInterstitial('statistics_view');
      }, 500);
    }
  };

  const getCompletionData = () => {
    const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365;
    const data = [];
    const labels = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      const completions = habits.reduce((count, habit) => {
        return count + (habit.completions?.includes(dateStr) ? 1 : 0);
      }, 0);
      
      data.push(completions);
      
      if (selectedPeriod === 'week') {
        labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
      } else if (selectedPeriod === 'month') {
        labels.push(date.getDate().toString());
      } else {
        labels.push(date.toLocaleDateString('en', { month: 'short' }));
      }
    }
    
    return { data, labels };
  };

  const getCategoryData = () => {
    const categoryCount = {};
    habits.forEach(habit => {
      categoryCount[habit.category] = (categoryCount[habit.category] || 0) + 1;
    });
    
    const colors = [
      '#4f46e5', '#7c3aed', '#10b981', '#f59e0b', 
      '#ef4444', '#06b6d4', '#8b5cf6', '#f97316'
    ];
    
    return Object.entries(categoryCount).map(([category, count], index) => ({
      name: category,
      population: count,
      color: colors[index % colors.length],
      legendFontColor: '#374151',
      legendFontSize: 12,
    }));
  };

  const getStreakData = () => {
    return habits.map(habit => ({
      name: habit.name.substring(0, 8) + (habit.name.length > 8 ? '...' : ''),
      current: habit.currentStreak || 0,
      best: habit.longestStreak || 0,
    }));
  };

  const getOverallStats = () => {
    const totalCompletions = habits.reduce((sum, habit) => 
      sum + (habit.totalCompletions || 0), 0);
    
    const activeHabits = habits.filter(habit => habit.isActive).length;
    
    const avgStreak = habits.length > 0 
      ? Math.round(habits.reduce((sum, habit) => 
          sum + (habit.currentStreak || 0), 0) / habits.length)
      : 0;
    
    const completionRate = habits.length > 0
      ? Math.round((habits.filter(habit => {
          const today = new Date().toDateString();
          return habit.completions?.includes(today);
        }).length / habits.length) * 100)
      : 0;

    return {
      totalCompletions,
      activeHabits,
      avgStreak,
      completionRate,
      bestStreak: userStats?.longestStreak || 0
    };
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
  };

  const renderOverviewCards = () => {
    const stats = getOverallStats();
    
    return (
      <View style={styles.overviewContainer}>
        <Card style={styles.overviewCard}>
          <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.overviewGradient}>
            <Icon name="check-all" size={24} color="#ffffff" />
            <Text style={styles.overviewValue}>{stats.totalCompletions}</Text>
            <Text style={styles.overviewLabel}>Total Completions</Text>
          </LinearGradient>
        </Card>

        <Card style={styles.overviewCard}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.overviewGradient}>
            <Icon name="fire" size={24} color="#ffffff" />
            <Text style={styles.overviewValue}>{stats.bestStreak}</Text>
            <Text style={styles.overviewLabel}>Best Streak</Text>
          </LinearGradient>
        </Card>

        <Card style={styles.overviewCard}>
          <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.overviewGradient}>
            <Icon name="target" size={24} color="#ffffff" />
            <Text style={styles.overviewValue}>{stats.activeHabits}</Text>
            <Text style={styles.overviewLabel}>Active Habits</Text>
          </LinearGradient>
        </Card>

        <Card style={styles.overviewCard}>
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.overviewGradient}>
            <Icon name="percent" size={24} color="#ffffff" />
            <Text style={styles.overviewValue}>{stats.completionRate}%</Text>
            <Text style={styles.overviewLabel}>Today's Rate</Text>
          </LinearGradient>
        </Card>
      </View>
    );
  };

  const renderCompletionChart = () => {
    const { data, labels } = getCompletionData();
    
    if (data.length === 0) return null;

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Completion Trend</Text>
          
          <View style={styles.periodSelector}>
            {['week', 'month', 'year'].map(period => (
              <Chip
                key={period}
                selected={selectedPeriod === period}
                onPress={() => setSelectedPeriod(period)}
                style={styles.periodChip}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Chip>
            ))}
          </View>

          <LineChart
            data={{
              labels,
              datasets: [{ data }],
            }}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            bezier
          />
        </Card.Content>
      </Card>
    );
  };

  const renderCategoryChart = () => {
    const categoryData = getCategoryData();
    
    if (categoryData.length === 0) return null;

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Habits by Category</Text>
          
          <PieChart
            data={categoryData}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </Card.Content>
      </Card>
    );
  };

  const renderStreakChart = () => {
    const streakData = getStreakData();
    
    if (streakData.length === 0) return null;

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Streak Comparison</Text>
          
          <BarChart
            data={{
              labels: streakData.map(item => item.name),
              datasets: [
                {
                  data: streakData.map(item => item.current),
                  color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                },
                {
                  data: streakData.map(item => item.best),
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                }
              ],
            }}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showBarTops={false}
          />
          
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4f46e5' }]} />
              <Text style={styles.legendText}>Current Streak</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendText}>Best Streak</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="loading" size={40} color="#4f46e5" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Statistics" />
      </Appbar.Header>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="chart-line" size={80} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create some habits and complete them to see your statistics!
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Home')}
              style={styles.emptyButton}
            >
              Go to Habits
            </Button>
          </View>
        ) : (
          <>
            {renderOverviewCards()}
            {renderCompletionChart()}
            {renderCategoryChart()}
            {renderStreakChart()}
            
            <AdBanner placement="statistics_bottom" style={styles.adBanner} />
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: (screenWidth - 56) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  overviewGradient: {
    padding: 16,
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
  },
  chartCard: {
    margin: 16,
    marginVertical: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    flex: 1,
  },
  chart: {
    borderRadius: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    paddingHorizontal: 20,
  },
  adBanner: {
    marginTop: 20,
  },
  bottomPadding: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});

export default StatisticsScreen;