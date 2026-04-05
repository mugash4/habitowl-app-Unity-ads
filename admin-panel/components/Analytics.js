export default function Analytics({ stats, onRefresh }) {
  const cards = [
    { label: 'Total users', value: stats.totalUsers || 0, emoji: '👥' },
    { label: 'Premium users', value: stats.premiumUsers || 0, emoji: '⭐' },
    { label: 'Total habits', value: stats.totalHabits || 0, emoji: '🎯' },
    { label: 'Weekly events', value: stats.weeklyEvents || 0, emoji: '📈' },
    { label: 'Support tickets', value: stats.supportTickets || 0, emoji: '🛟' },
    { label: 'Deletion requests', value: stats.deletionRequests || 0, emoji: '🗑️' }
  ];

  return (
    <div>
      <div style={styles.grid}>
        {cards.map((card) => (
          <div key={card.label} style={styles.card}>
            <div style={styles.icon}>{card.emoji}</div>
            <div>
              <div style={styles.label}>{card.label}</div>
              <div style={styles.value}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.metaRow}>
        <button onClick={onRefresh} style={styles.button}>Refresh dashboard</button>
        <div style={styles.infoPill}>Average habits per user: <strong>{stats.averageHabitsPerUser || 0}</strong></div>
        <div style={styles.infoPill}>Estimated MRR: <strong>${Number(stats.estimatedMonthlyRevenue || 0).toFixed(2)}</strong></div>
      </div>

      <div style={styles.note}>
        This dashboard matches HabitOwl’s existing Firestore collections and admin email system, so you do not need to change the mobile app UI or your EAS build setup.
      </div>
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 20,
    marginBottom: 24
  },
  card: {
    background: '#ffffff',
    borderRadius: 18,
    padding: 22,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)'
  },
  icon: { fontSize: 34 },
  label: { color: '#6b7280', fontSize: 14, marginBottom: 8 },
  value: { color: '#111827', fontSize: 30, fontWeight: 800 },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    marginBottom: 24
  },
  button: {
    border: 'none',
    background: '#4f46e5',
    color: '#ffffff',
    borderRadius: 12,
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  infoPill: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 999,
    padding: '10px 14px',
    color: '#374151',
    fontSize: 14
  },
  note: {
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    color: '#3730a3',
    borderRadius: 16,
    padding: 16,
    lineHeight: 1.6,
    fontSize: 14
  }
};
