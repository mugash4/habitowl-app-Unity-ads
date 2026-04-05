import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [adminEmails, setAdminEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [usersSnap, settingsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'admin_config'))
      ]);

      const settingsDoc = settingsSnap.docs.find((item) => item.id === 'settings');
      const adminList = settingsDoc?.data()?.admin_emails || [];
      setAdminEmails(adminList);

      setUsers(usersSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Could not load users. Check Firestore rules.');
    } finally {
      setLoading(false);
    }
  };

  const togglePremium = async (userDocId, currentValue) => {
    try {
      await updateDoc(doc(db, 'users', userDocId), {
        isPremium: !currentValue,
        premiumUpdatedAt: new Date().toISOString()
      });
      await loadUsers();
    } catch (error) {
      console.error(error);
      alert('Failed to update premium status.');
    }
  };

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return users.filter((user) => {
      const email = (user.email || '').toLowerCase();
      const name = (user.displayName || '').toLowerCase();
      return !term || email.includes(term) || name.includes(term);
    });
  }, [search, users]);

  if (loading) {
    return <div style={styles.loading}>Loading users...</div>;
  }

  return (
    <div style={styles.card}>
      <div style={styles.topRow}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or display name"
          style={styles.search}
        />
        <button onClick={loadUsers} style={styles.refresh}>Refresh</button>
      </div>

      <div style={styles.meta}>
        Admin users are determined by <strong>admin_config/settings → admin_emails</strong> in HabitOwl.
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Premium</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const isAdmin = adminEmails.some((value) => String(value).toLowerCase().trim() === String(user.email || '').toLowerCase().trim());

              return (
                <tr key={user.id}>
                  <td style={styles.td}>{user.email || 'N/A'}</td>
                  <td style={styles.td}>{user.displayName || '—'}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(isAdmin ? styles.badgeAdmin : styles.badgeUser) }}>
                      {isAdmin ? 'admin' : 'user'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(user.isPremium ? styles.badgePremium : styles.badgeFree) }}>
                      {user.isPremium ? 'Premium' : 'Free'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {!isAdmin ? (
                      <button onClick={() => togglePremium(user.id, !!user.isPremium)} style={styles.actionBtn}>
                        {user.isPremium ? 'Remove Premium' : 'Grant Premium'}
                      </button>
                    ) : (
                      <span style={styles.noAction}>Admin managed by email list</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#ffffff',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)'
  },
  topRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap'
  },
  search: {
    flex: 1,
    minWidth: 260,
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 14
  },
  refresh: {
    border: 'none',
    background: '#4f46e5',
    color: '#ffffff',
    borderRadius: 12,
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  meta: {
    marginBottom: 16,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 1.6
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: 12,
    background: '#f8fafc',
    color: '#374151',
    fontSize: 13,
    borderBottom: '1px solid #e5e7eb'
  },
  td: {
    padding: 12,
    borderBottom: '1px solid #f1f5f9',
    color: '#111827',
    fontSize: 14,
    verticalAlign: 'middle'
  },
  badge: {
    display: 'inline-block',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700
  },
  badgeAdmin: { background: '#ede9fe', color: '#5b21b6' },
  badgeUser: { background: '#f3f4f6', color: '#4b5563' },
  badgePremium: { background: '#dcfce7', color: '#166534' },
  badgeFree: { background: '#fef3c7', color: '#92400e' },
  actionBtn: {
    border: 'none',
    background: '#111827',
    color: '#ffffff',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    cursor: 'pointer'
  },
  noAction: { color: '#9ca3af', fontSize: 13 },
  loading: { padding: 30, color: '#6b7280' }
};
