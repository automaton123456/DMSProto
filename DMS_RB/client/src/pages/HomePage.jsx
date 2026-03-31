import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import Table from 'react-bootstrap/Table';
import Icon from '@mdi/react';
import { mdiFilePlusOutline, mdiTrayArrowDown, mdiFileDocumentMultipleOutline, mdiChartBoxOutline } from '@mdi/js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const TILES = [
  { id: 'create',   title: 'Create DMS Document', subtitle: 'Upload a new document',          icon: mdiFilePlusOutline,               variant: 'primary',  route: '/documents/new',  countKey: null },
  { id: 'inbox',    title: 'DMS Inbox',            subtitle: 'Items pending your approval',    icon: mdiTrayArrowDown,                  variant: 'warning',  route: '/inbox',           countKey: 'inboxCount' },
  { id: 'my-docs',  title: 'My DMS Forms',         subtitle: 'Your submitted documents',       icon: mdiFileDocumentMultipleOutline,   variant: 'success',  route: '/my-documents',    countKey: 'myDocsCount' },
  { id: 'report',   title: 'DMS Report',           subtitle: 'Search all DMS documents',       icon: mdiChartBoxOutline,               variant: 'info',     route: '/report',          countKey: null },
  { id: 'completed-report', title: 'Completed DMS Report', subtitle: 'Search approved workflow documents', icon: mdiChartBoxOutline, variant: 'secondary', route: '/completed-report', countKey: null },
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
      <div className="mb-4 pt-2">
        <h3 className="fw-bold mb-1">Welcome, {currentUser?.displayName}</h3>
        <p className="text-muted mb-0">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <Row className="g-3 mb-4">
        {TILES.map(tile => {
          const count = tile.countKey ? counts[tile.countKey] || 0 : 0;
          return (
            <Col key={tile.id} xs={12} sm={6} lg={3}>
              <Card
                className="tile-card h-100 shadow-sm"
                style={{ borderTop: `4px solid var(--bs-${tile.variant})` }}
                onClick={() => navigate(tile.route)}
              >
                <Card.Body className="d-flex flex-column justify-content-between p-3">
                  <div>
                    {count > 0 && (
                      <Badge bg={tile.variant} text={tile.variant === 'warning' ? 'dark' : undefined} className="float-end">
                        {count}
                      </Badge>
                    )}
                    <div className={`bg-${tile.variant} bg-opacity-10 rounded-2 d-flex align-items-center justify-content-center mb-3`}
                      style={{ width: 40, height: 40 }}>
                      <Icon path={tile.icon} size={1} className={`text-${tile.variant}`} />
                    </div>
                  </div>
                  <div>
                    <div className="fw-bold mb-1" style={{ fontSize: '0.95rem' }}>{tile.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>{tile.subtitle}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

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
                      <td className="fw-semibold text-primary">{doc.documentId}</td>
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
