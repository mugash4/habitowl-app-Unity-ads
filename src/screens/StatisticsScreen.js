import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import FirebaseService from '../services/FirebaseService';
import adMobService from '../services/AdMobService';

const { width: screenWidth } = Dimensions.get('window');

const StatisticsScreen = ({ navigation }) => {
  const [habits, setHabits] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year
  const [isPremium, setIsPremium] = useState(false);


  useEffect(() => {
    loadStatistics();
  }, []);

  // 🔧 FIX: Reload statistics when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📊 Statistics screen focused - reloading data...');
      loadStatistics();
    }, [])
  );

  const loadStatistics = async () => {
    try {
      setLoading(true);
  
      const [userHabits, stats] = await Promise.all([
        FirebaseService.getUserHabits(),
        FirebaseService.getUserStats()
      ]);
  
      console.log('📊 Loaded', userHabits ? userHabits.length : 0, 'habits for statistics');
  
      // ✅ FIX: Check both premium status AND admin status
      let premiumStatus = stats?.isPremium || false;
    
      // Double-check admin status if not premium
      if (!premiumStatus) {
        const user = FirebaseService.currentUser;
        if (user && user.email) {
          const AdminService = require('../services/AdminService').default;
          const isAdmin = await AdminService.checkAdminStatus(user.email);
          if (isAdmin) {
            console.log('✅ Admin user - enabling all premium features');
            premiumStatus = true;
          }
        }
      }
    
      setIsPremium(premiumStatus);
      setHabits(userHabits || []);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
      setHabits([]);
      setUserStats(null);
    } finally {
      setLoading(false);
    }
  };



  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
    
    // Show interstitial ad occasionally after viewing stats
    setTimeout(async () => {
      try {
        await adMobService.showInterstitialAd('statistics_view');
      } catch (error) {
        console.log('Ad not shown:', error);
      }
    }, 500);
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
      
      // ✅ IMPROVED: Better label formatting for clarity
      if (selectedPeriod === 'week') {
        // Show day names for week view
        labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
      } else if (selectedPeriod === 'month') {
        // Show date with month for month view (every 3rd day to avoid crowding)
        if (i % 3 === 0 || i === 0 || i === days - 1) {
          labels.push(date.toLocaleDateString('en', { day: 'numeric', month: 'short' }));
        } else {
          labels.push('');
        }
      } else {
        // Show months for year view (every 30th day)
        if (i % 30 === 0 || i === 0 || i === days - 1) {
          labels.push(date.toLocaleDateString('en', { month: 'short' }));
        } else {
          labels.push('');
        }
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
    strokeWidth: 3, // ✅ IMPROVED: Thicker line for better visibility
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForDots: {
      r: '4', // ✅ IMPROVED: Larger dots for data points
      strokeWidth: '2',
      stroke: '#4f46e5'
    },
    propsForLabels: {
      fontSize: 10, // ✅ IMPROVED: Slightly larger font
      fontWeight: '600' // ✅ IMPROVED: Bold labels
    }
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

    // ✅ IMPROVED: Calculate max value for better Y-axis scaling
    const maxValue = Math.max(...data, 1);

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Completion Trend</Text>
            <Text style={styles.chartSubtitle}>
              Track your daily habit completions
            </Text>
          </View>
          
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
              datasets: [{
                data,
                color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                strokeWidth: 3
              }],
            }}
            width={screenWidth - 64}
            height={240}
            yAxisSuffix=" "
            yAxisInterval={1}
            chartConfig={{
              ...chartConfig,
              formatYLabel: (value) => Math.round(value).toString()
            }}
            style={styles.chart}
            bezier
            fromZero
            segments={Math.min(maxValue, 5)} // ✅ IMPROVED: Better Y-axis segments
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
          />
          
          {/* ✅ NEW: Add legend for better understanding */}
          <View style={styles.chartLegend}>
            <Icon name="information-outline" size={16} color="#6b7280" />
            <Text style={styles.chartLegendText}>
              Showing completed habits per day
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderCategoryChart = () => {
    // 🔒 Premium feature - Category breakdown
    if (!isPremium) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text style={styles.chartTitle}>Habits by Category</Text>
            <View style={styles.premiumLock}>
              <Icon name="lock" size={48} color="#9ca3af" />
              <Text style={styles.premiumLockTitle}>Premium Feature</Text>
              <Text style={styles.premiumLockText}>
                Upgrade to Premium to view detailed category breakdowns
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Premium')}
                style={styles.premiumButton}
              >
                Upgrade to Premium
              </Button>
            </View>
          </Card.Content>
        </Card>
      );
    }
  
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
  bottomPadding: {
    height: 160, // ✅ FIXED: Space for tab bar + banner ad
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
  chartHeader: {
    marginBottom: 8,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  chartLegendText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  premiumLock: {
    alignItems: 'center',
    padding: 40,
  },
  premiumLockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  premiumLockText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  premiumButton: {
    backgroundColor: '#4f46e5',
  },

});

export default StatisticsScreen;
