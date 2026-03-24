import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Icon from '@mdi/react';
import { mdiFilePlusOutline, mdiFileDocumentMultipleOutline, mdiPencilOutline } from '@mdi/js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function MyDocuments() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('createdDate');
  const [sortDir, setSortDir] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/my-documents?currentUser=${currentUser.username}`)
      .then(r => r.json())
      .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = docs.filter(d => statusFilter === 'all' || d.status === statusFilter);
  const sorted = [...filtered].sort((a, b) => {
    const av = sortKey === 'addDesc' ? (a.classifications?.addDesc || '') : a[sortKey] || '';
    const bv = sortKey === 'addDesc' ? (b.classifications?.addDesc || '') : b[sortKey] || '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }) => (
    <span className="ms-1 text-muted" style={{ opacity: sortKey === col ? 1 : 0.4, fontSize: '0.72rem' }}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  const statusCounts = docs.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" variant="primary" />
    </div>
  );

  return (
    <div className="page-container">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb" style={{ fontSize: '0.8rem' }}>
          <li className="breadcrumb-item">
            <span className="text-primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Home</span>
          </li>
          <li className="breadcrumb-item active">My DMS Forms</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <h3 className="fw-bold mb-0">My DMS Forms</h3>
          <Badge bg="secondary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}>
            {docs.length} document{docs.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <Button variant="primary" onClick={() => navigate('/documents/new')}>
          <Icon path={mdiFilePlusOutline} size={0.75} className="me-1" />New Document
        </Button>
      </div>

      {docs.length > 0 && (
        <div className="d-flex gap-2 mb-3 flex-wrap">
          {[['all', 'All', docs.length], ...Object.entries(statusCounts).map(([s, c]) => [s, s, c])].map(([val, label, count]) => (
            <Button key={val} size="sm" variant={statusFilter === val ? 'primary' : 'outline-secondary'} onClick={() => setStatusFilter(val)} className="rounded-pill">
              {label} ({count})
            </Button>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <Card className="shadow-sm">
          <Card.Body className="text-center py-5">
            <Icon path={mdiFileDocumentMultipleOutline} size={3} className="text-muted mb-3" style={{ opacity: 0.25 }} />
            <h5 className="text-muted">No documents yet</h5>
            <p className="text-muted mb-4">Create your first DMS document to get started</p>
            <Button variant="primary" onClick={() => navigate('/documents/new')}>
              <Icon path={mdiFilePlusOutline} size={0.75} className="me-1" />Create Document
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <div style={{ overflowX: 'auto' }}>
            <Table hover className="mb-0" style={{ fontSize: '0.8125rem' }}>
              <thead className="table-light">
                <tr>
                  {[
                    ['documentId', 'Document ID'],
                    ['rig', 'Rig'],
                    ['docType', 'Type/Group'],
                    ['addDesc', 'Description'],
                    ['status', 'Status'],
                    ['createdDate', 'Date Created']
                  ].map(([key, label]) => (
                    <th key={key} className="sortable-th" onClick={() => handleSort(key)}>
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(doc => (
                  <tr key={doc.documentId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/documents/${doc.documentId}`)}>
                    <td className="fw-semibold text-primary">{doc.documentId}</td>
                    <td>{doc.rig}</td>
                    <td>{doc.docType}/{doc.docGroup}</td>
                    <td className="text-muted" style={{ maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.classifications?.addDesc || '—'}
                      </div>
                    </td>
                    <td><StatusBadge status={doc.status} /></td>
                    <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{new Date(doc.createdDate).toLocaleDateString('en-GB')}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/documents/${doc.documentId}`)}>
                        <Icon path={mdiPencilOutline} size={0.65} />
                      </Button>
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
