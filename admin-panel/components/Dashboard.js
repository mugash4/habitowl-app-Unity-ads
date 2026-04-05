import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Analytics from './Analytics';
import APIKeyManager from './APIKeyManager';
import UserManager from './UserManager';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalHabits: 0,
    weeklyEvents: 0,
    supportTickets: 0,
    deletionRequests: 0,
    averageHabitsPerUser: 0,
    estimatedMonthlyRevenue: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));

      const [usersSnap, habitsSnap, analyticsSnap, supportSnap, deleteSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'habits')),
        getDocs(collection(db, 'analytics')),
        getDocs(collection(db, 'support_tickets')),
        getDocs(collection(db, 'deletion_requests'))
      ]);

      const totalUsers = usersSnap.size;
      const premiumUsers = usersSnap.docs.filter((item) => item.data().isPremium === true).length;
      const totalHabits = habitsSnap.size;
      const weeklyEvents = analyticsSnap.docs.filter((item) => {
        const value = item.data().timestamp;
        if (!value) return false;
        if (typeof value?.toDate === 'function') return value.toDate() >= sevenDaysAgo;
        const parsed = new Date(value);
        return !Number.isNaN(parsed.getTime()) && parsed >= sevenDaysAgo;
      }).length;
      const supportTickets = supportSnap.size;
      const deletionRequests = deleteSnap.docs.filter((item) => item.data().status === 'pending' || !item.data().status).length;
      const averageHabitsPerUser = totalUsers ? (totalHabits / totalUsers).toFixed(1) : 0;
      const estimatedMonthlyRevenue = premiumUsers * 4.99;

      setStats({
        totalUsers,
        premiumUsers,
        totalHabits,
        weeklyEvents,
        supportTickets,
        deletionRequests,
        averageHabitsPerUser,
        estimatedMonthlyRevenue
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      alert('Dashboard load failed. Check your Firestore rules and collections.');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brand}>🦉 HabitOwl Admin</div>
          <div style={styles.nav}>
            <button onClick={() => setActiveTab('analytics')} style={{ ...styles.navBtn, ...(activeTab === 'analytics' ? styles.navBtnActive : {}) }}>📊 Analytics</button>
            <button onClick={() => setActiveTab('api')} style={{ ...styles.navBtn, ...(activeTab === 'api' ? styles.navBtnActive : {}) }}>🔑 API Keys</button>
            <button onClick={() => setActiveTab('users')} style={{ ...styles.navBtn, ...(activeTab === 'users' ? styles.navBtnActive : {}) }}>👥 Users</button>
          </div>
        </div>

        <div style={styles.userCard}>
          <div style={styles.userLabel}>Signed in as</div>
          <div style={styles.userEmail}>{user?.email}</div>
          <button onClick={logout} style={styles.logoutBtn}>Log out</button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            {activeTab === 'analytics' && 'Analytics dashboard'}
            {activeTab === 'api' && 'API key management'}
            {activeTab === 'users' && 'User management'}
          </h1>
          <p style={styles.subtitle}>
            This panel is separate from the Expo app, exactly like the PawGuard setup, so your HabitOwl mobile app stays unchanged.
          </p>
        </div>

        <div style={styles.content}>
          {activeTab === 'analytics' && <Analytics stats={stats} onRefresh={loadStats} />}
          {activeTab === 'api' && <APIKeyManager />}
          {activeTab === 'users' && <UserManager />}
        </div>
      </main>
    </div>
  );
}

const styles = {
  layout: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    background: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  sidebar: {
    background: '#111827',
    color: '#ffffff',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  brand: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 28
  },
  nav: { display: 'grid', gap: 10 },
  navBtn: {
    border: 'none',
    textAlign: 'left',
    padding: '14px 16px',
    borderRadius: 14,
    background: 'transparent',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600
  },
  navBtnActive: {
    background: '#4f46e5'
  },
  userCard: {
    borderTop: '1px solid rgba(255,255,255,0.12)',
    paddingTop: 20
  },
  userLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
  userEmail: { fontSize: 14, marginBottom: 14, wordBreak: 'break-word' },
  logoutBtn: {
    width: '100%',
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'transparent',
    color: '#ffffff',
    borderRadius: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 700
  },
  main: { minWidth: 0 },
  header: {
    padding: '28px 32px 18px',
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff'
  },
  title: {
    margin: '0 0 8px',
    color: '#111827',
    fontSize: 32,
    lineHeight: 1.1
  },
  subtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 1.6,
    maxWidth: 820
  },
  content: {
    padding: 32
  }
};
