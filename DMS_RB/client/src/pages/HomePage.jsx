import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import Table from 'react-bootstrap/Table';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const TILES = [
  {
    id: 'create',
    title: 'Create DMS Document',
    subtitle: 'Upload a new document',
    icon: '📄',
    color: '#0070f2',
    route: '/documents/new',
    countKey: null
  },
  {
    id: 'inbox',
    title: 'DMS Inbox',
    subtitle: 'Items pending your approval',
    icon: '📥',
    color: '#e86826',
    route: '/inbox',
    countKey: 'inboxCount'
  },
  {
    id: 'my-docs',
    title: 'My DMS Forms',
    subtitle: 'Your submitted documents',
    icon: '🗂️',
    color: '#107e3e',
    route: '/my-documents',
    countKey: 'myDocsCount'
  },
  {
    id: 'report',
    title: 'DMS Report',
    subtitle: 'Search all DMS documents',
    icon: '📊',
    color: '#6c32a0',
    route: '/report',
    countKey: null
  }
];

export default function HomePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [recentDocs, setRecentDocs] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/tile-data?currentUser=${currentUser.username}`)
      .then(r => r.json())
      .then(setCounts)
      .catch(() => {});

    fetch(`/api/my-documents?currentUser=${currentUser.username}`)
      .then(r => r.json())
      .then(docs => setRecentDocs(Array.isArray(docs) ? docs.slice(0, 5) : []))
      .catch(() => {});
  }, [currentUser]);

  return (
    <div className="page-container">
      {/* Welcome header */}
      <div className="mb-4 pt-2">
        <h3 className="fw-bold mb-1">Welcome, {currentUser?.displayName}</h3>
        <p className="text-muted mb-0">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Tiles */}
      <Row className="g-3 mb-4">
        {TILES.map(tile => {
          const count = tile.countKey ? counts[tile.countKey] || 0 : 0;
          return (
            <Col key={tile.id} xs={12} sm={6} lg={3}>
              <Card
                className="tile-card h-100 shadow-sm"
                style={{ borderTop: `4px solid ${tile.color}`, cursor: 'pointer' }}
                onClick={() => navigate(tile.route)}
              >
                <Card.Body className="d-flex flex-column justify-content-between p-3">
                  <div>
                    {count > 0 && (
                      <Badge
                        style={{ background: tile.color, float: 'right', fontSize: '0.75rem' }}
                      >
                        {count}
                      </Badge>
                    )}
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: `${tile.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', marginBottom: '0.75rem'
                    }}>
                      {tile.icon}
                    </div>
                  </div>
                  <div>
                    <div className="fw-bold mb-1" style={{ fontSize: '0.95rem', color: '#32363a' }}>
                      {tile.title}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                      {tile.subtitle}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Recent Documents */}
      {recentDocs.length > 0 && (
        <div>
          <h5 className="fw-bold mb-3">Recent Documents</h5>
          <Card className="shadow-sm">
            <div style={{ overflowX: 'auto' }}>
              <Table hover className="mb-0" style={{ fontSize: '0.875rem' }}>
                <thead className="table-light">
                  <tr>
                    <th>Document ID</th>
                    <th>Type/Group</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map(doc => (
                    <tr
                      key={doc.documentId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/documents/${doc.documentId}`)}
                    >
                      <td className="fw-semibold" style={{ color: '#0070f2' }}>{doc.documentId}</td>
                      <td>{doc.docType}/{doc.docGroup}</td>
                      <td className="text-muted">{doc.classifications?.addDesc || '—'}</td>
                      <td><StatusBadge status={doc.status} /></td>
                      <td className="text-muted">
                        {new Date(doc.createdDate).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
