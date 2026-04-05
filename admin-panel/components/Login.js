import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      console.error(err);
      setError('Sign in failed. Use the same admin email/password you created in Firebase Authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.badge}>🦉 HabitOwl</div>
          <h1 style={styles.title}>Admin Panel</h1>
          <p style={styles.subtitle}>
            Sign in with an email that is listed inside <strong>admin_config/settings → admin_emails</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error ? <div style={styles.error}>{error}</div> : null}

          <label style={styles.label}>Admin email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={styles.input}
            required
          />

          <label style={{ ...styles.label, marginTop: 16 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={styles.input}
            required
          />

          <button type="submit" disabled={loading} style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={styles.helpBox}>
          <p style={styles.helpTitle}>Before first login</p>
          <ol style={styles.helpList}>
            <li>Create your user in Firebase Authentication.</li>
            <li>Add the exact same email to Firestore: <strong>admin_config/settings</strong> → <strong>admin_emails</strong>.</li>
            <li>Then sign in here.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  card: {
    width: '100%',
    maxWidth: 460,
    background: '#ffffff',
    borderRadius: 24,
    padding: 32,
    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)'
  },
  header: { marginBottom: 24 },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    color: '#4338ca',
    background: '#eef2ff',
    borderRadius: 999,
    padding: '8px 12px'
  },
  title: {
    margin: '16px 0 8px',
    fontSize: 32,
    lineHeight: 1.1,
    color: '#111827'
  },
  subtitle: {
    margin: 0,
    color: '#6b7280',
    lineHeight: 1.6,
    fontSize: 15
  },
  form: { marginTop: 24 },
  label: {
    display: 'block',
    marginBottom: 8,
    color: '#374151',
    fontSize: 14,
    fontWeight: 600
  },
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 14,
    padding: '14px 16px',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box'
  },
  button: {
    marginTop: 20,
    width: '100%',
    border: 'none',
    borderRadius: 14,
    padding: '14px 18px',
    background: '#4f46e5',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer'
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed'
  },
  error: {
    marginBottom: 16,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.5
  },
  helpBox: {
    marginTop: 24,
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 16
  },
  helpTitle: {
    margin: '0 0 8px',
    fontWeight: 700,
    color: '#111827'
  },
  helpList: {
    margin: 0,
    paddingLeft: 18,
    color: '#4b5563',
    lineHeight: 1.7,
    fontSize: 14
  }
};
