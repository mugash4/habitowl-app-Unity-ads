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
import { useTabBarHeight } from '../hooks/useTabBarHeight';

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
  const [isAdmin, setIsAdmin] = useState(false);

  const { totalHeight: tabBarTotalHeight } = useTabBarHeight();

  useEffect(() => {
    loadStatistics();
  }, []);

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
  
      let premiumStatus = stats?.isPremium || false;
      let adminStatus = false;
    
      if (!premiumStatus) {
        const user = FirebaseService.currentUser;
        if (user && user.email) {
          const AdminService = require('../services/AdminService').default;
          adminStatus = await AdminService.checkAdminStatus(user.email);
          if (adminStatus) {
            console.log('✅ Admin user - enabling all premium features');
            premiumStatus = true;
          }
        }
      }
    
      setIsPremium(premiumStatus);
      setIsAdmin(adminStatus);
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
    
    if (!isPremium && !isAdmin) {
      setTimeout(async () => {
        try {
          await adMobService.showInterstitialAd('statistics_view');
        } catch (error) {
          console.log('[Statistics] Ad not shown:', error);
        }
      }, 500);
    } else {
      console.log('[Statistics] 👑 Premium/Admin user - no ads on refresh');
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
      
      // ✅ FIXED: Better label generation logic to prevent overlapping
      if (selectedPeriod === 'week') {
        // Show all 7 days with short names
        labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
      } else if (selectedPeriod === 'month') {
        // Show only 6 labels evenly distributed (start, 5 evenly spaced, end)
        if (i === 0 || i === days - 1 || i % 6 === 0) {
          labels.push(date.getDate().toString());
        } else {
          labels.push('');
        }
      } else {
        // Year: Show only 12 months
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
      legendFontSize: 11, // ✅ FIXED: Reduced font size to prevent overlap
    }));
  };

  const getStreakData = () => {
    // ✅ FIXED: Limit to 6 habits max and shorten names further
    return habits.slice(0, 6).map(habit => ({
      name: habit.name.substring(0, 6) + (habit.name.length > 6 ? '..' : ''),
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

  // ✅ FIXED: Updated chart configuration with better label sizing
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.6, // ✅ FIXED: Reduced from 0.7 to give more space
    decimalPlaces: 0,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#4f46e5'
    },
    propsForLabels: {
      fontSize: 9, // ✅ FIXED: Reduced from 10 to 9
      fontWeight: '500' // ✅ FIXED: Reduced weight for cleaner look
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

    const maxValue = Math.max(...data, 1);
    
    // ✅ FIXED: Adjust chart width based on period to give more horizontal space
    const chartWidth = selectedPeriod === 'week' 
      ? screenWidth - 64 
      : selectedPeriod === 'month' 
        ? screenWidth - 48  // More width for month view
        : screenWidth - 48; // More width for year view

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
                textStyle={styles.periodChipText}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Chip>
            ))}
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={selectedPeriod !== 'week'}
            style={styles.chartScrollView}
          >
            <LineChart
              data={{
                labels,
                datasets: [{
                  data,
                  color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                  strokeWidth: 3
                }],
              }}
              width={chartWidth}
              height={240}
              yAxisSuffix=" "
              yAxisInterval={1}
              chartConfig={{
                ...chartConfig,
                formatYLabel: (value) => Math.round(value).toString(),
                propsForLabels: {
                  fontSize: selectedPeriod === 'year' ? 8 : 9, // ✅ FIXED: Smaller for year view
                  fontWeight: '500'
                }
              }}
              style={styles.chart}
              bezier
              fromZero
              segments={Math.min(maxValue, 5)}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={false}
              withHorizontalLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
            />
          </ScrollView>
          
          <View style={styles.chartLegend}>
            <Icon name="information-outline" size={16} color="#6b7280" />
            <Text style={styles.chartLegendText}>
              {selectedPeriod === 'week' 
                ? 'Showing completed habits per day' 
                : selectedPeriod === 'month'
                  ? 'Showing last 30 days - scroll to see all'
                  : 'Showing last 12 months - scroll to see all'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderCategoryChart = () => {
    if (!isPremium && !isAdmin) {
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
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Streak Comparison</Text>
            {habits.length > 6 && (
              <Text style={styles.chartSubtitle}>
                Showing top 6 habits
              </Text>
            )}
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.chartScrollView}
          >
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
              width={Math.max(screenWidth - 64, streakData.length * 80)} // ✅ FIXED: Dynamic width
              height={220}
              chartConfig={{
                ...chartConfig,
                propsForLabels: {
                  fontSize: 8, // ✅ FIXED: Smaller font for bar labels
                  fontWeight: '500'
                }
              }}
              style={styles.chart}
              showBarTops={false}
              fromZero
            />
          </ScrollView>
          
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
        contentContainerStyle={{
          paddingBottom: tabBarTotalHeight + 20
        }}
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
    marginBottom: 4, // ✅ FIXED: Reduced spacing
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    marginTop: 8, // ✅ FIXED: Added top margin
  },
  periodChip: {
    flex: 1,
  },
  periodChipText: {
    fontSize: 12, // ✅ FIXED: Smaller chip text
  },
  chart: {
    borderRadius: 8,
  },
  chartScrollView: {
    marginHorizontal: -8, // ✅ FIXED: Better horizontal alignment
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
    fontSize: 11, // ✅ FIXED: Smaller legend text
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
    fontSize: 13, // ✅ FIXED: Slightly smaller
    color: '#6b7280',
    marginTop: 2,
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
    fontSize: 11, // ✅ FIXED: Smaller legend text
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
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
