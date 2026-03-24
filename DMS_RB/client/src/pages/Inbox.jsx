import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Icon from '@mdi/react';
import { mdiTrayArrowDown, mdiOpenInNew } from '@mdi/js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Inbox() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('createdDate');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/inbox?currentUser=${currentUser.username}`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...items].sort((a, b) => {
    const av = sortKey === 'docTypeGroup' ? `${a.docType}/${a.docGroup}` :
      sortKey === 'addDesc' ? (a.classifications?.addDesc || '') : a[sortKey] || '';
    const bv = sortKey === 'docTypeGroup' ? `${b.docType}/${b.docGroup}` :
      sortKey === 'addDesc' ? (b.classifications?.addDesc || '') : b[sortKey] || '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }) => (
    <span className="ms-1 text-muted" style={{ opacity: sortKey === col ? 1 : 0.4, fontSize: '0.72rem' }}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

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
          <li className="breadcrumb-item active">DMS Inbox</li>
        </ol>
      </nav>

      <div className="d-flex align-items-center gap-3 mb-4">
        <h3 className="fw-bold mb-0">DMS Inbox</h3>
        <Badge bg={items.length > 0 ? 'primary' : 'secondary'} style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card className="shadow-sm">
          <Card.Body className="text-center py-5">
            <Icon path={mdiTrayArrowDown} size={2.5} className="text-muted mb-3" style={{ opacity: 0.3 }} />
            <h5 className="text-muted">Inbox is empty</h5>
            <p className="text-muted mb-0">No documents pending your approval</p>
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
                    ['originator', 'Originator'],
                    ['docTypeGroup', 'Type/Group'],
                    ['addDesc', 'Description'],
                    ['rig', 'Rig'],
                    ['createdDate', 'Date Created'],
                    ['step', 'Workflow Step']
                  ].map(([key, label]) => (
                    <th key={key} className="sortable-th" onClick={() => handleSort(key)}>
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(doc => (
                  <tr key={doc.documentId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/documents/${doc.documentId}/approve`)}>
                    <td className="fw-semibold text-primary">{doc.documentId}</td>
                    <td>{doc.originator}</td>
                    <td>{doc.docType}/{doc.docGroup}</td>
                    <td className="text-muted" style={{ maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.classifications?.addDesc || '—'}
                      </div>
                    </td>
                    <td>{doc.rig}</td>
                    <td className="text-muted">{new Date(doc.createdDate).toLocaleDateString('en-GB')}</td>
                    <td><StatusBadge status={doc.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="primary" onClick={() => navigate(`/documents/${doc.documentId}/approve`)}>
                        <Icon path={mdiOpenInNew} size={0.65} className="me-1" />Review
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
