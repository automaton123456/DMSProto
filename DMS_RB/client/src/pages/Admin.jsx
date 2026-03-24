import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';
import Nav from 'react-bootstrap/Nav';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_COLORS = {
  'Draft': 'secondary',
  'Approved': 'success',
  'Rejected': 'danger',
  'Pending MSV Approval': 'warning',
  'Pending E&M Approval': 'primary'
};

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
      setUsers(u); setApprovers(a); setStats(s); setLoading(false);
    });
  }, [currentUser]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="page-container">
        <Alert variant="danger">Access denied. Admin role required.</Alert>
        <Button variant="link" onClick={() => navigate('/')}>← Go Home</Button>
      </div>
    );
  }

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" variant="primary" />
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

  return (
    <div className="page-container">
      <h3 className="fw-bold mb-4">Administration</h3>

      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage('')} className="mb-4">
          {message}
        </Alert>
      )}

      {/* Tabs */}
      <Nav
        variant="tabs"
        className="mb-4"
        activeKey={activeTab}
        onSelect={setActiveTab}
      >
        <Nav.Item>
          <Nav.Link eventKey="overview">Overview</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="approvers">Workflow Approvers</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="users">User Management</Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Overview */}
      {activeTab === 'overview' && stats && (
        <Row className="g-3">
          <Col xs={6} md={3}>
            <Card className="text-center shadow-sm">
              <Card.Body>
                <div className="text-primary" style={{ fontSize: '2.5rem', fontWeight: 700 }}>{stats.total}</div>
                <div className="text-muted small mt-1">Total Documents</div>
              </Card.Body>
            </Card>
          </Col>
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <Col key={status} xs={6} md={3}>
              <Card className="text-center shadow-sm">
                <Card.Body>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                    <Badge bg={STATUS_COLORS[status] || 'secondary'} style={{ fontSize: '1.5rem', padding: '0.3rem 0.6rem' }}>
                      {count}
                    </Badge>
                  </div>
                  <div className="text-muted small mt-2" style={{ fontSize: '0.78rem' }}>{status}</div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Approvers */}
      {activeTab === 'approvers' && approvers && (
        <Card className="shadow-sm">
          <Card.Body>
            <h5 className="fw-bold mb-1">Workflow Approver Configuration</h5>
            <p className="text-muted small mb-4">
              Configure which users can approve MSV and E&M workflow steps. Comma-separate multiple usernames.
            </p>
            <Row className="g-4">
              <Col md={6}>
                <h6 className="fw-bold mb-3 text-primary">MSV Approvers</h6>
                <Form.Group>
                  <Form.Label className="fw-semibold">Default MSV Approvers</Form.Label>
                  <Form.Control
                    value={approvers.msvApprovers.default?.join(', ') || ''}
                    onChange={e => setApprovers(prev => ({
                      ...prev,
                      msvApprovers: { ...prev.msvApprovers, default: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                    }))}
                    placeholder="e.g. MANAGER1, MANAGER2"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <h6 className="fw-bold mb-3 text-info">E&M Approvers</h6>
                <Form.Group>
                  <Form.Label className="fw-semibold">Default E&M Approvers</Form.Label>
                  <Form.Control
                    value={approvers.emApprovers.default?.join(', ') || ''}
                    onChange={e => setApprovers(prev => ({
                      ...prev,
                      emApprovers: { ...prev.emApprovers, default: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                    }))}
                    placeholder="e.g. ENGINEER1, MANAGER2"
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="mt-4">
              <Button variant="primary" onClick={saveApprovers}>
                💾 Save Approver Config
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <Card className="shadow-sm">
          <div style={{ overflowX: 'auto' }}>
            <Table hover className="mb-0" style={{ fontSize: '0.875rem' }}>
              <thead className="table-light">
                <tr>
                  {['Username', 'Display Name', 'Email', 'Department', 'Role', 'Actions'].map(h => (
                    <th key={h} className="fw-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.username}>
                    <td className="fw-semibold">{user.username}</td>
                    <td>{user.displayName}</td>
                    <td className="text-muted">{user.email}</td>
                    <td>{user.department}</td>
                    <td>
                      <Badge bg={user.role === 'admin' ? 'primary' : 'secondary'} style={{ fontSize: '0.72rem' }}>
                        {user.role}
                      </Badge>
                    </td>
                    <td>
                      {user.username !== currentUser.username && (
                        <Button
                          size="sm"
                          variant={user.role === 'admin' ? 'outline-danger' : 'outline-primary'}
                          onClick={() => updateRole(user.username, user.role === 'admin' ? 'user' : 'admin')}
                        >
                          {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
