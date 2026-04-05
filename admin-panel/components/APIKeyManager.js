import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const defaultState = {
  deepseek: '',
  openai: '',
  openrouter: '',
  admob: ''
};

export default function APIKeyManager() {
  const [apiKeys, setApiKeys] = useState(defaultState);
  const [defaultProvider, setDefaultProvider] = useState('deepseek');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [keysSnap, settingsSnap] = await Promise.all([
        getDoc(doc(db, 'admin_config', 'api_keys')),
        getDoc(doc(db, 'admin_config', 'settings'))
      ]);

      if (keysSnap.exists()) {
        setApiKeys((prev) => ({ ...prev, ...keysSnap.data() }));
      }

      if (settingsSnap.exists() && settingsSnap.data().defaultAiProvider) {
        setDefaultProvider(settingsSnap.data().defaultAiProvider);
      }
    } catch (error) {
      console.error(error);
      setMessage('Failed to load API settings. Check Firestore rules.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await Promise.all([
        setDoc(doc(db, 'admin_config', 'api_keys'), {
          ...apiKeys,
          updatedAt: new Date().toISOString()
        }, { merge: true }),
        setDoc(doc(db, 'admin_config', 'settings'), {
          defaultAiProvider: defaultProvider,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      ]);

      setMessage('Saved successfully. Your mobile app will use these values immediately.');
    } catch (error) {
      console.error(error);
      setMessage('Failed to save. Make sure your email is in admin_config/settings → admin_emails.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading API configuration...</div>;
  }

  const Field = ({ label, field, placeholder }) => (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>{label}</label>
      <input
        type="text"
        value={apiKeys[field] || ''}
        onChange={(e) => setApiKeys((prev) => ({ ...prev, [field]: e.target.value }))}
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  );

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>API key management</h2>
      <p style={styles.desc}>
        This writes to the same Firestore documents already used by HabitOwl mobile: <strong>admin_config/api_keys</strong> and <strong>admin_config/settings</strong>.
      </p>

      {message ? <div style={styles.message}>{message}</div> : null}

      <div style={styles.providerBox}>
        <label style={styles.label}>Default AI provider</label>
        <select value={defaultProvider} onChange={(e) => setDefaultProvider(e.target.value)} style={styles.select}>
          <option value="deepseek">deepseek</option>
          <option value="openai">openai</option>
          <option value="openrouter">openrouter</option>
        </select>
      </div>

      <Field label="DeepSeek API key" field="deepseek" placeholder="sk-..." />
      <Field label="OpenAI API key" field="openai" placeholder="sk-..." />
      <Field label="OpenRouter API key" field="openrouter" placeholder="sk-or-v1-..." />
      <Field label="AdMob App ID" field="admob" placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx" />

      <button onClick={handleSave} disabled={saving} style={{ ...styles.button, ...(saving ? styles.buttonDisabled : {}) }}>
        {saving ? 'Saving...' : 'Save settings'}
      </button>

      <div style={styles.infoBox}>
        <strong>Important:</strong> do not encrypt these keys inside the admin panel unless you also change the mobile app code. HabitOwl currently reads plain values from <strong>admin_config/api_keys</strong>.
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
  title: { margin: '0 0 10px', color: '#111827', fontSize: 26 },
  desc: { margin: '0 0 20px', color: '#6b7280', lineHeight: 1.6 },
  fieldWrap: { marginBottom: 18 },
  label: { display: 'block', marginBottom: 8, color: '#374151', fontWeight: 700, fontSize: 14 },
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 14,
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 14,
    background: '#ffffff'
  },
  providerBox: { marginBottom: 18 },
  button: {
    border: 'none',
    background: '#4f46e5',
    color: '#ffffff',
    borderRadius: 12,
    padding: '12px 18px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  buttonDisabled: { opacity: 0.65, cursor: 'not-allowed' },
  message: {
    marginBottom: 16,
    background: '#ecfeff',
    border: '1px solid #a5f3fc',
    color: '#155e75',
    padding: 12,
    borderRadius: 12,
    lineHeight: 1.5
  },
  infoBox: {
    marginTop: 18,
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412',
    padding: 14,
    borderRadius: 14,
    lineHeight: 1.6,
    fontSize: 14
  },
  loading: { padding: 30, color: '#6b7280' }
};
