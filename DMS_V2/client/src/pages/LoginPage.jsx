import React, { useState } from 'react';
import {
  Card,
  Select,
  Option,
  Button,
  Title,
  Text,
  Icon
} from '@ui5/webcomponents-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { users, login } = useAuth();
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!selected) return;
    setLoading(true);
    await login(selected);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0070f2 0%, #003d8f 100%)',
      padding: '1rem'
    }}>
      <Card style={{ width: '100%', maxWidth: '420px', padding: '2.5rem 2rem', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, #0070f2, #003d8f)',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 4px 16px rgba(0,112,242,0.3)'
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M8 6h16l8 8v20H8V6z" fill="white" opacity="0.95"/>
              <path d="M24 6v8h8" fill="none" stroke="#0070f2" strokeWidth="2"/>
              <rect x="12" y="18" width="16" height="2.5" rx="1.25" fill="#0070f2"/>
              <rect x="12" y="22" width="13" height="2.5" rx="1.25" fill="#0070f2"/>
              <rect x="12" y="26" width="10" height="2.5" rx="1.25" fill="#0070f2"/>
            </svg>
          </div>
          <Title level="H3" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Document Management System
          </Title>
          <Text style={{ color: '#6a6d70', fontSize: '0.9rem' }}>
            DMS V2 — Prototype Sign In
          </Text>
        </div>

        {/* User selector */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#32363a' }}>
            Select User
          </label>
          <Select
            style={{ width: '100%' }}
            onChange={(e) => setSelected(e.detail.selectedOption.dataset.value)}
          >
            <Option data-value="" disabled>— Select a user —</Option>
            {users.map(u => (
              <Option key={u.username} data-value={u.username}>
                {u.displayName} ({u.role === 'admin' ? 'Admin' : u.username})
              </Option>
            ))}
          </Select>
        </div>

        <Button
          design="Emphasized"
          style={{ width: '100%' }}
          disabled={!selected || loading}
          onClick={handleLogin}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>

        <Text style={{ display: 'block', marginTop: '1.5rem', fontSize: '0.75rem', color: '#6a6d70' }}>
          Prototype mode — select any user to continue.<br/>
          Production uses Microsoft Azure AD SSO.
        </Text>
      </Card>
    </div>
  );
}
