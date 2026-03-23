import React, { useState, useEffect } from 'react';
import { Title, Card, Button, Select, Option, Input, Label, MessageStrip, BusyIndicator } from '@ui5/webcomponents-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [approvers, setApprovers] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/workflow-approvers').then(r => r.json()),
      fetch('/api/admin/stats').then(r => r.json())
    ]).then(([u, a, s]) => {
      setUsers(u);
      setApprovers(a);
      setStats(s);
      setLoading(false);
    });
  }, [currentUser]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="page-container">
        <MessageStrip design="Negative">Access denied. Admin role required.</MessageStrip>
        <Button design="Transparent" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>Go Home</Button>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <BusyIndicator active size="L" />
    </div>
  );

  const saveApprovers = async () => {
    await fetch('/api/admin/workflow-approvers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvers)
    });
    setMessage('Approver configuration saved successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const updateRole = async (username, role) => {
    await fetch(`/api/admin/users/${username}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    setUsers(prev => prev.map(u => u.username === username ? { ...u, role } : u));
    setMessage(`Updated role for ${username}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'approvers', label: 'Workflow Approvers' },
    { id: 'users', label: 'User Management' }
  ];

  const STATUS_COLORS = {
    'Draft': '#666', 'Approved': '#107e3e', 'Rejected': '#b00',
    'Pending MSV Approval': '#b26000', 'Pending E&M Approval': '#0070f2'
  };

  return (
    <div className="page-container">
      <Title level="H2" style={{ marginBottom: '1.5rem' }}>Administration</Title>

      {message && (
        <MessageStrip design="Positive" style={{ marginBottom: '1rem' }} onClose={() => setMessage('')}>
          {message}
        </MessageStrip>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid #e8e8e8' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '0.65rem 1.25rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: activeTab === t.id ? '#0070f2' : '#6a6d70',
              borderBottom: activeTab === t.id ? '2px solid #0070f2' : '2px solid transparent',
              marginBottom: '-2px',
              transition: 'color 0.15s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && stats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <Card style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#0070f2' }}>{stats.total}</div>
              <div style={{ fontSize: '0.85rem', color: '#6a6d70', marginTop: '0.25rem' }}>Total Documents</div>
            </Card>
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <Card key={status} style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: STATUS_COLORS[status] || '#32363a' }}>{count}</div>
                <div style={{ fontSize: '0.8rem', color: '#6a6d70', marginTop: '0.25rem' }}>{status}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approvers tab */}
      {activeTab === 'approvers' && approvers && (
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <Title level="H4" style={{ marginBottom: '1.25rem' }}>Workflow Approver Configuration</Title>
            <p style={{ color: '#6a6d70', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Configure which users can approve MSV and E&M workflow steps.
              Comma-separate multiple usernames.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <Title level="H5" style={{ marginBottom: '1rem', color: '#0070f2' }}>MSV Approvers</Title>
                <Label>Default MSV Approvers</Label>
                <Input
                  style={{ width: '100%' }}
                  value={approvers.msvApprovers.default?.join(', ') || ''}
                  onInput={e => setApprovers(prev => ({
                    ...prev,
                    msvApprovers: { ...prev.msvApprovers, default: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                  }))}
                  placeholder="e.g. MANAGER1, MANAGER2"
                />
              </div>
              <div>
                <Title level="H5" style={{ marginBottom: '1rem', color: '#6c32a0' }}>E&M Approvers</Title>
                <Label>Default E&M Approvers</Label>
                <Input
                  style={{ width: '100%' }}
                  value={approvers.emApprovers.default?.join(', ') || ''}
                  onInput={e => setApprovers(prev => ({
                    ...prev,
                    emApprovers: { ...prev.emApprovers, default: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                  }))}
                  placeholder="e.g. ENGINEER1, MANAGER2"
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <Button design="Emphasized" icon="save" onClick={saveApprovers}>Save Approver Config</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users tab */}
      {activeTab === 'users' && (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f5f6f7', borderBottom: '2px solid #e8e8e8' }}>
                  {['Username', 'Display Name', 'Email', 'Department', 'Role', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.username} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{user.username}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>{user.displayName}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#6a6d70' }}>{user.email}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>{user.department}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{
                        background: user.role === 'admin' ? '#e3f2fd' : '#f0f0f0',
                        color: user.role === 'admin' ? '#0070f2' : '#666',
                        padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: 600
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {user.username !== currentUser.username && (
                        <Button
                          design="Transparent"
                          onClick={() => updateRole(user.username, user.role === 'admin' ? 'user' : 'admin')}
                        >
                          {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
