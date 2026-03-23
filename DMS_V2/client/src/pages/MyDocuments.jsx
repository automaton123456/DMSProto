import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Card, Button, BusyIndicator, Icon, MessageStrip } from '@ui5/webcomponents-react';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_STYLES = {
  'Draft': { background: '#f0f0f0', color: '#666' },
  'Approved': { background: '#e8f5e9', color: '#107e3e' },
  'Rejected': { background: '#fce4ec', color: '#b00' },
  'Pending MSV Approval': { background: '#fff3e0', color: '#b26000' },
  'Pending E&M Approval': { background: '#e3f2fd', color: '#0070f2' }
};

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
    <span style={{ marginLeft: '0.3rem', opacity: sortKey === col ? 1 : 0.3 }}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  const statusCounts = docs.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <BusyIndicator active size="L" />
    </div>
  );

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Title level="H2">My DMS Forms</Title>
          <span style={{ background: '#f0f0f0', color: '#666', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 700 }}>
            {docs.length} document{docs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button design="Emphasized" icon="add-document" onClick={() => navigate('/documents/new')}>
          New Document
        </Button>
      </div>

      {/* Status filter tabs */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[['all', 'All', docs.length], ...Object.entries(statusCounts).map(([s, c]) => [s, s, c])].map(([val, label, count]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '1rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: statusFilter === val ? '#0070f2' : '#f0f0f0',
                color: statusFilter === val ? 'white' : '#32363a',
                transition: 'all 0.15s'
              }}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Icon name="document" style={{ fontSize: '3rem', color: '#d9d9d9', marginBottom: '1rem' }} />
            <Title level="H4" style={{ color: '#6a6d70', marginBottom: '0.5rem' }}>No documents yet</Title>
            <p style={{ color: '#6a6d70', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Create your first DMS document to get started
            </p>
            <Button design="Emphasized" onClick={() => navigate('/documents/new')}>Create Document</Button>
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
                    ['rig', 'Rig'],
                    ['docType', 'Type/Group'],
                    ['addDesc', 'Description'],
                    ['status', 'Status'],
                    ['createdDate', 'Date Created']
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      style={{ padding: '0.65rem 1rem', textAlign: 'left', cursor: 'pointer', fontWeight: 600, userSelect: 'none', whiteSpace: 'nowrap' }}
                    >
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                  <th style={{ padding: '0.65rem 1rem', width: '80px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(doc => (
                  <tr
                    key={doc.documentId}
                    onClick={() => navigate(`/documents/${doc.documentId}`)}
                    style={{ cursor: 'pointer', transition: 'background 0.1s', borderBottom: '1px solid #f0f0f0' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#0070f2' }}>{doc.documentId}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>{doc.rig}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>{doc.docType}/{doc.docGroup}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#6a6d70', maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.classifications?.addDesc || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{
                        ...(STATUS_STYLES[doc.status] || {}),
                        padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: 600
                      }}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: '#6a6d70', whiteSpace: 'nowrap' }}>
                      {new Date(doc.createdDate).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }} onClick={e => e.stopPropagation()}>
                      <Button design="Transparent" icon="edit" onClick={() => navigate(`/documents/${doc.documentId}`)} />
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
