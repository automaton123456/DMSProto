import React, { useState } from 'react';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
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
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-primary p-3">
      <Card style={{ width: '100%', maxWidth: '420px' }} className="shadow-lg">
        <Card.Body className="p-5 text-center">
          <div className="mb-4">
            <div className="bg-primary rounded-3 d-inline-flex align-items-center justify-content-center mb-3 shadow"
              style={{ width: 72, height: 72 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M8 6h16l8 8v20H8V6z" fill="white" opacity="0.95" />
                <path d="M24 6v8h8" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                <rect x="12" y="18" width="16" height="2.5" rx="1.25" fill="rgba(255,255,255,0.8)" />
                <rect x="12" y="22" width="13" height="2.5" rx="1.25" fill="rgba(255,255,255,0.8)" />
                <rect x="12" y="26" width="10" height="2.5" rx="1.25" fill="rgba(255,255,255,0.8)" />
              </svg>
            </div>
            <h4 className="fw-bold mb-1">Document Management System</h4>
            <p className="text-muted small mb-0">DMS — React Bootstrap · Prototype Sign In</p>
          </div>

          <Form.Group className="mb-4 text-start">
            <Form.Label className="fw-semibold">Select User</Form.Label>
            <Form.Select
              value={selected}
              onChange={e => setSelected(e.target.value)}
            >
              <option value="">— Select a user —</option>
              {users.map(u => (
                <option key={u.username} value={u.username}>
                  {u.displayName} ({u.role === 'admin' ? 'Admin' : u.username})
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Button
            variant="primary"
            className="w-100"
            disabled={!selected || loading}
            onClick={handleLogin}
          >
            {loading ? (
              <><Spinner size="sm" className="me-2" />Signing In...</>
            ) : (
              'Sign In'
            )}
          </Button>

          <p className="text-muted mt-4 mb-0" style={{ fontSize: '0.75rem' }}>
            Prototype mode — select any user to continue.<br />
            Production uses Microsoft Azure AD SSO.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
}
