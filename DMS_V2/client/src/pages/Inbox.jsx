import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Card, Button, BusyIndicator, MessageStrip, Icon } from '@ui5/webcomponents-react';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_STYLES = {
  'Pending MSV Approval': { background: '#fff3e0', color: '#b26000' },
  'Pending E&M Approval': { background: '#e3f2fd', color: '#0070f2' }
};

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
      sortKey === 'addDesc' ? (a.classifications?.addDesc || '') :
      a[sortKey] || '';
    const bv = sortKey === 'docTypeGroup' ? `${b.docType}/${b.docGroup}` :
      sortKey === 'addDesc' ? (b.classifications?.addDesc || '') :
      b[sortKey] || '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: '0.3rem', opacity: sortKey === col ? 1 : 0.3 }}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  const getCurrentStep = (doc) => {
    if (!doc.workflow?.required) return '—';
    if (doc.workflow.currentStep === 'msv') return 'MSV Approval';
    if (doc.workflow.currentStep === 'em') return 'E&M Approval';
    return doc.status;
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <BusyIndicator active size="L" />
    </div>
  );

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Title level="H2">DMS Inbox</Title>
        <span style={{
          background: items.length > 0 ? '#e3f2fd' : '#f0f0f0',
          color: items.length > 0 ? '#0070f2' : '#666',
          padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 700
        }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {items.length === 0 ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Icon name="inbox" style={{ fontSize: '3rem', color: '#d9d9d9', marginBottom: '1rem' }} />
            <Title level="H4" style={{ color: '#6a6d70', marginBottom: '0.5rem' }}>Inbox is empty</Title>
            <p style={{ color: '#6a6d70', fontSize: '0.9rem' }}>No documents pending your approval</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f5f6f7', borderBottom: '2px solid #e8e8e8' }}>
                  {[
                    ['documentId', 'Document ID'],
                    ['originator', 'Originator'],
                    ['docTypeGroup', 'Type/Group'],
                    ['addDesc', 'Description'],
                    ['rig', 'Rig'],
                    ['createdDate', 'Date Created'],
                    ['step', 'Workflow Step']
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      style={{ padding: '0.65rem 1rem', textAlign: 'left', cursor: 'pointer', fontWeight: 600, userSelect: 'none', whiteSpace: 'nowrap' }}
                    >
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                  <th style={{ padding: '0.65rem 1rem', width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(doc => (
                  <tr
                    key={doc.documentId}
                    onClick={() => navigate(`/documents/${doc.documentId}/approve`)}
                    style={{ cursor: 'pointer', transition: 'background 0.1s', borderBottom: '1px solid #f0f0f0' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#0070f2' }}>{doc.documentId}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>{doc.originator}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>{doc.docType}/{doc.docGroup}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#6a6d70', maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.classifications?.addDesc || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>{doc.rig}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#6a6d70' }}>
                      {new Date(doc.createdDate).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{
                        ...(STATUS_STYLES[doc.status] || {}),
                        padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: 600
                      }}>
                        {getCurrentStep(doc)}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }} onClick={e => e.stopPropagation()}>
                      <Button
                        design="Emphasized"
                        onClick={() => navigate(`/documents/${doc.documentId}/approve`)}
                      >
                        Review
                      </Button>
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
