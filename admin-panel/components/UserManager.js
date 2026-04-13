import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';

export default function UserManager({ onStatsRefresh }) {
  const [users, setUsers] = useState([]);
  const [adminEmails, setAdminEmails] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const settingsRef = doc(db, 'admin_config', 'settings');
      const pendingDeletionQuery = query(
        collection(db, 'deletion_requests'),
        where('status', '==', 'pending')
      );

      const [usersSnap, settingsSnap, deletionSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDoc(settingsRef),
        getDocs(pendingDeletionQuery)
      ]);

      const adminList = settingsSnap.exists() && Array.isArray(settingsSnap.data().admin_emails)
        ? settingsSnap.data().admin_emails
        : [];

      setAdminEmails(adminList);
      setUsers(usersSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setDeletionRequests(
        deletionSnap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => new Date(b.requestDate || 0) - new Date(a.requestDate || 0))
      );
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Could not load users. Check Firestore rules and Functions deployment.');
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
      await onStatsRefresh?.();
    } catch (error) {
      console.error(error);
      alert('Failed to update premium status.');
    }
  };

  const cancelDeletionRequest = async (requestId) => {
    const confirmed = window.confirm('Cancel this deletion request? The user account will stay active.');
    if (!confirmed) return;

    try {
      setProcessingRequestId(requestId);
      await updateDoc(doc(db, 'deletion_requests', requestId), {
        status: 'cancelled_by_admin',
        cancelledAt: new Date().toISOString()
      });
      await loadUsers();
      await onStatsRefresh?.();
      alert('Deletion request cancelled.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to cancel deletion request.');
    } finally {
      setProcessingRequestId('');
    }
  };

  const processDeletion = async (requestItem) => {
    const confirmed = window.confirm(
      `Delete ${requestItem.userEmail || requestItem.userId} completely?\n\nThis permanently removes the Firebase Authentication account and the user data handled by the Cloud Function.`
    );
    if (!confirmed) return;

    try {
      setProcessingRequestId(requestItem.id);
      const callable = httpsCallable(functions, 'adminDeleteUserAccount');
      const response = await callable({
        userId: requestItem.userId,
        requestId: requestItem.id
      });

      const payload = response?.data || {};
      const deletedRecords = payload.deletedRecords || {};
      const deletedSummary = [
        `Auth user: ${payload.authDeleted ? 'deleted' : 'already missing'}`,
        `User docs: ${deletedRecords.userDocument || 0}`,
        `Habits: ${deletedRecords.habits || 0}`,
        `Analytics: ${deletedRecords.analytics || 0}`,
        `Referrals: ${deletedRecords.referrals || 0}`,
        `Support tickets: ${deletedRecords.supportTickets || 0}`,
        `Crash reports: ${deletedRecords.crashReports || 0}`,
        `Consents: ${deletedRecords.userConsents || 0}`,
        `Data exports: ${deletedRecords.dataExports || 0}`
      ].join('\n');

      await loadUsers();
      await onStatsRefresh?.();
      alert(`Account deleted successfully.\n\n${deletedSummary}`);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Failed to delete account. Make sure Firebase Functions is deployed.');
    } finally {
      setProcessingRequestId('');
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
    <div style={styles.layout}>
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

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>Pending deletion requests</h3>
            <p style={styles.sectionSubtitle}>
              This section is now fully actionable. Approving a request removes the Firebase Auth account and all matching Firestore data through a secured Cloud Function.
            </p>
          </div>
          <span style={{ ...styles.badge, ...(deletionRequests.length ? styles.badgeDelete : styles.badgeUser) }}>
            {deletionRequests.length} pending
          </span>
        </div>

        {deletionRequests.length === 0 ? (
          <div style={styles.emptyState}>No pending deletion requests right now.</div>
        ) : (
          <div style={styles.deletionList}>
            {deletionRequests.map((requestItem) => (
              <div key={requestItem.id} style={styles.deletionCard}>
                <div style={styles.deletionMeta}>
                  <div style={styles.deletionEmail}>{requestItem.userEmail || requestItem.userId}</div>
                  <div style={styles.deletionInfo}>User ID: {requestItem.userId}</div>
                  <div style={styles.deletionInfo}>Requested: {requestItem.requestDate ? new Date(requestItem.requestDate).toLocaleString() : '—'}</div>
                  <div style={styles.deletionInfo}>Scheduled: {requestItem.scheduledDeletionDate ? new Date(requestItem.scheduledDeletionDate).toLocaleString() : '—'}</div>
                  <div style={styles.reasonBox}>
                    <strong>Reason:</strong> {requestItem.reason || 'No reason provided'}
                  </div>
                </div>

                <div style={styles.actionsCol}>
                  <button
                    onClick={() => processDeletion(requestItem)}
                    disabled={processingRequestId === requestItem.id}
                    style={{ ...styles.actionBtn, ...styles.deleteBtn, ...(processingRequestId === requestItem.id ? styles.buttonDisabled : {}) }}
                  >
                    {processingRequestId === requestItem.id ? 'Deleting...' : 'Delete account completely'}
                  </button>
                  <button
                    onClick={() => cancelDeletionRequest(requestItem.id)}
                    disabled={processingRequestId === requestItem.id}
                    style={{ ...styles.secondaryBtn, ...(processingRequestId === requestItem.id ? styles.buttonDisabled : {}) }}
                  >
                    Cancel request
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: 'grid',
    gap: 24
  },
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
  badgeDelete: { background: '#fee2e2', color: '#b91c1c' },
  actionBtn: {
    border: 'none',
    background: '#111827',
    color: '#ffffff',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    cursor: 'pointer'
  },
  deleteBtn: {
    background: '#dc2626'
  },
  secondaryBtn: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#374151',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    cursor: 'pointer'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  noAction: { color: '#9ca3af', fontSize: 13 },
  loading: { padding: 30, color: '#6b7280' },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  sectionTitle: {
    margin: 0,
    fontSize: 22,
    color: '#111827'
  },
  sectionSubtitle: {
    margin: '8px 0 0',
    color: '#6b7280',
    lineHeight: 1.6,
    fontSize: 14,
    maxWidth: 760
  },
  emptyState: {
    padding: '18px 16px',
    borderRadius: 14,
    background: '#f8fafc',
    color: '#6b7280',
    border: '1px dashed #d1d5db'
  },
  deletionList: {
    display: 'grid',
    gap: 16
  },
  deletionCard: {
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 18,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  deletionMeta: {
    flex: 1,
    minWidth: 280
  },
  deletionEmail: {
    fontSize: 17,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 8,
    wordBreak: 'break-word'
  },
  deletionInfo: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6
  },
  reasonBox: {
    marginTop: 10,
    background: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    color: '#374151',
    lineHeight: 1.6,
    fontSize: 14
  },
  actionsCol: {
    display: 'grid',
    gap: 10,
    minWidth: 220
  }
};
