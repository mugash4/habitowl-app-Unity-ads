import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser?.email) {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const settingsRef = doc(db, 'admin_config', 'settings');
        const settingsSnap = await getDoc(settingsRef);
        const adminEmails = settingsSnap.exists() && Array.isArray(settingsSnap.data().admin_emails)
          ? settingsSnap.data().admin_emails
          : [];

        const email = currentUser.email.toLowerCase().trim();
        const allowed = adminEmails.some((value) => String(value).toLowerCase().trim() === email);

        if (!allowed) {
          await signOut(auth);
          alert('Access denied. Your email is not listed in admin_config/settings → admin_emails.');
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setUser(currentUser);
        setIsAdmin(true);
      } catch (error) {
        console.error('Admin check failed:', error);
        await signOut(auth).catch(() => {});
        setUser(null);
        setIsAdmin(false);
        alert('Unable to verify admin access. Check Firebase rules and admin_config/settings.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading HabitOwl Admin...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Login />;
  }

  return <Dashboard user={user} />;
}

const styles = {
  loadingWrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  spinner: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    border: '5px solid #e5e7eb',
    borderTopColor: '#4f46e5',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: 16,
    color: '#4b5563',
    fontSize: 16
  }
};
