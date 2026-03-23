import React, { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Card,
  Icon
} from '@ui5/webcomponents-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const tiles = [
  {
    id: 'create',
    title: 'Create DMS Document',
    subtitle: 'Upload a new document',
    icon: 'add-document',
    color: '#0070f2',
    bgGradient: 'linear-gradient(135deg, #0070f2 0%, #003d8f 100%)',
    route: '/documents/new',
    countKey: null
  },
  {
    id: 'inbox',
    title: 'DMS Inbox',
    subtitle: 'Items pending your approval',
    icon: 'inbox',
    color: '#e86826',
    bgGradient: 'linear-gradient(135deg, #e86826 0%, #c04d00 100%)',
    route: '/inbox',
    countKey: 'inboxCount'
  },
  {
    id: 'my-docs',
    title: 'My DMS Forms',
    subtitle: 'Your submitted documents',
    icon: 'my-sales-order',
    color: '#107e3e',
    bgGradient: 'linear-gradient(135deg, #107e3e 0%, #0a5229 100%)',
    route: '/my-documents',
    countKey: 'myDocsCount'
  },
  {
    id: 'report',
    title: 'DMS Report',
    subtitle: 'Search all DMS documents',
    icon: 'bar-chart',
    color: '#6c32a0',
    bgGradient: 'linear-gradient(135deg, #6c32a0 0%, #46216b 100%)',
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
      .then(docs => setRecentDocs(docs.slice(0, 5)))
      .catch(() => {});
  }, [currentUser]);

  const getStatusStyle = (status) => {
    const map = {
      'Draft': { background: '#f0f0f0', color: '#666' },
      'Approved': { background: '#e8f5e9', color: '#107e3e' },
      'Rejected': { background: '#fce4ec', color: '#b00' },
      'Pending MSV Approval': { background: '#fff3e0', color: '#b26000' },
      'Pending E&M Approval': { background: '#e3f2fd', color: '#0070f2' }
    };
    return map[status] || { background: '#f0f0f0', color: '#666' };
  };

  return (
    <div className="page-container">
      {/* Welcome header */}
      <div style={{ marginBottom: '2rem', paddingTop: '0.5rem' }}>
        <Title level="H2">Welcome, {currentUser?.displayName}</Title>
        <Text style={{ color: '#6a6d70' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </div>

      {/* Main tiles */}
      <div className="dashboard-tiles">
        {tiles.map(tile => (
          <div
            key={tile.id}
            onClick={() => navigate(tile.route)}
            className="tile-card"
            style={{
              background: tile.bgGradient,
              color: 'white',
              padding: '1.5rem',
              minHeight: '160px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: `0 4px 16px ${tile.color}40`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background icon */}
            <div style={{
              position: 'absolute',
              right: '-10px',
              bottom: '-10px',
              opacity: 0.12,
              fontSize: '100px',
              lineHeight: 1,
              pointerEvents: 'none'
            }}>
              <Icon name={tile.icon} style={{ fontSize: '100px', color: 'white' }} />
            </div>

            {/* Count badge */}
            {tile.countKey && counts[tile.countKey] > 0 && (
              <div style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'white',
                color: tile.color,
                borderRadius: '1rem',
                padding: '0.15rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                minWidth: '24px',
                textAlign: 'center'
              }}>
                {counts[tile.countKey]}
              </div>
            )}

            {/* Content */}
            <div>
              <Icon name={tile.icon} style={{ fontSize: '2rem', color: 'white', marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                {tile.title}
              </div>
              <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>
                {tile.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Documents */}
      {recentDocs.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <Title level="H4" style={{ marginBottom: '1rem' }}>Recent Documents</Title>
          <Card>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f5f6f7', borderBottom: '2px solid #e8e8e8' }}>
                  {['Document ID', 'Type/Group', 'Description', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, color: '#32363a' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentDocs.map(doc => (
                  <tr
                    key={doc.documentId}
                    onClick={() => navigate(`/documents/${doc.documentId}`)}
                    style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#0070f2' }}>
                      {doc.documentId}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {doc.docType}/{doc.docGroup}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: '#6a6d70' }}>
                      {doc.classifications?.addDesc || '—'}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{
                        ...getStatusStyle(doc.status),
                        padding: '0.2rem 0.6rem',
                        borderRadius: '1rem',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: '#6a6d70' }}>
                      {new Date(doc.createdDate).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
