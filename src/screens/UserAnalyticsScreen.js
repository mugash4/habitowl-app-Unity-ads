import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Card,
  Appbar,
  DataTable,
  Chip,
  SegmentedButtons,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const UserAnalyticsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    newUsers: 0,
    activeUsers: 0,
    premiumUsers: 0,
    retentionRate: 0,
    avgHabitsPerUser: 0,
    topUsers: [],
    dailyActiveUsers: [],
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Get all users
      const usersQuery = collection(db, 'users');
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get habits
      const habitsQuery = collection(db, 'habits');
      const habitsSnapshot = await getDocs(habitsQuery);
      const habits = habitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get recent analytics events
      const analyticsQuery = query(
        collection(db, 'analytics'),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );
      const analyticsSnapshot = await getDocs(analyticsQuery);
      const events = analyticsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate metrics
      const totalUsers = users.length;
      const premiumUsers = users.filter(u => u.isPremium).length;
      
      // New users in time range
      const newUsers = users.filter(u => {
        const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
        return createdAt >= startDate;
      }).length;

      // Active users (users with events in time range)
      const activeUserIds = new Set(events.map(e => e.userId));
      const activeUsers = activeUserIds.size;

      // Retention rate
      const retentionRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0;

      // Average habits per user
      const avgHabitsPerUser = totalUsers > 0 ? (habits.length / totalUsers).toFixed(1) : 0;

      // Top users by habit count
      const habitCounts = {};
      habits.forEach(habit => {
        habitCounts[habit.userId] = (habitCounts[habit.userId] || 0) + 1;
      });

      const topUsers = Object.entries(habitCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId, count]) => {
          const user = users.find(u => u.uid === userId);
          return {
            userId,
            email: user?.email || 'Unknown',
            habitCount: count,
            isPremium: user?.isPremium || false,
          };
        });

      // Daily active users (last 7 days)
      const dailyActiveUsers = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayEvents = events.filter(e => {
          const eventDate = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
          return eventDate >= date && eventDate < nextDate;
        });

        const uniqueUsers = new Set(dayEvents.map(e => e.userId));
        
        dailyActiveUsers.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: uniqueUsers.size,
        });
      }

      setAnalytics({
        totalUsers,
        newUsers,
        activeUsers,
        premiumUsers,
        retentionRate,
        avgHabitsPerUser,
        topUsers,
        dailyActiveUsers,
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (title, value, icon, colors, subtitle) => (
    <Card style={styles.statCard}>
      <LinearGradient colors={colors} style={styles.statGradient}>
        <Icon name={icon} size={28} color="#ffffff" />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </LinearGradient>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="User Analytics" />
        <Appbar.Action icon="refresh" onPress={loadAnalytics} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        <View style={styles.timeRangeContainer}>
          <SegmentedButtons
            value={timeRange}
            onValueChange={setTimeRange}
            buttons={[
              { value: '7days', label: '7 Days' },
              { value: '30days', label: '30 Days' },
              { value: '90days', label: '90 Days' },
            ]}
          />
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Users',
            analytics.totalUsers,
            'account-group',
            ['#4f46e5', '#7c3aed']
          )}
          {renderStatCard(
            'New Users',
            `+${analytics.newUsers}`,
            'account-plus',
            ['#10b981', '#059669'],
            `in ${timeRange.replace('days', ' days')}`
          )}
          {renderStatCard(
            'Active Users',
            analytics.activeUsers,
            'account-check',
            ['#f59e0b', '#d97706'],
            `${analytics.retentionRate}% retention`
          )}
          {renderStatCard(
            'Premium Users',
            analytics.premiumUsers,
            'crown',
            ['#ef4444', '#dc2626'],
            `${((analytics.premiumUsers / analytics.totalUsers) * 100).toFixed(1)}% conversion`
          )}
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>📊 Key Metrics</Text>
            
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Avg. Habits per User</Text>
              <Text style={styles.metricValue}>{analytics.avgHabitsPerUser}</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>User Retention Rate</Text>
              <Text style={styles.metricValue}>{analytics.retentionRate}%</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Premium Conversion</Text>
              <Text style={styles.metricValue}>
                {((analytics.premiumUsers / analytics.totalUsers) * 100).toFixed(1)}%
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>📈 Daily Active Users (Last 7 Days)</Text>
            
            <View style={styles.chartContainer}>
              {analytics.dailyActiveUsers.map((day, index) => (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: Math.max((day.count / Math.max(...analytics.dailyActiveUsers.map(d => d.count))) * 100, 5),
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barValue}>{day.count}</Text>
                  <Text style={styles.barLabel}>{day.date}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>🏆 Top Users by Habit Count</Text>
            
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>User</DataTable.Title>
                <DataTable.Title numeric>Habits</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
              </DataTable.Header>

              {analytics.topUsers.map((user, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {user.email}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text style={styles.habitCount}>{user.habitCount}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {user.isPremium ? (
                      <Chip icon="crown" style={styles.premiumChip} textStyle={styles.chipText}>
                        Premium
                      </Chip>
                    ) : (
                      <Chip style={styles.freeChip} textStyle={styles.chipText}>
                        Free
                      </Chip>
                    )}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card.Content>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  timeRangeContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.95,
    marginTop: 4,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 4,
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  metricLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '80%',
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    backgroundColor: '#4f46e5',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#374151',
    maxWidth: 150,
  },
  habitCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4f46e5',
  },
  premiumChip: {
    backgroundColor: '#fef3c7',
    height: 28,
  },
  freeChip: {
    backgroundColor: '#f3f4f6',
    height: 28,
  },
  chipText: {
    fontSize: 11,
    marginVertical: 0,
  },
  bottomSpacing: {
    height: 32,
  },
});

export default UserAnalyticsScreen;
