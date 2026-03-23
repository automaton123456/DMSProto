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
    accentColor: '#0070f2',
    route: '/documents/new',
    countKey: null
  },
  {
    id: 'inbox',
    title: 'DMS Inbox',
    subtitle: 'Items pending your approval',
    icon: 'inbox',
    accentColor: '#e86826',
    route: '/inbox',
    countKey: 'inboxCount'
  },
  {
    id: 'my-docs',
    title: 'My DMS Forms',
    subtitle: 'Your submitted documents',
    icon: 'my-sales-order',
    accentColor: '#107e3e',
    route: '/my-documents',
    countKey: 'myDocsCount'
  },
  {
    id: 'report',
    title: 'DMS Report',
    subtitle: 'Search all DMS documents',
    icon: 'bar-chart',
    accentColor: '#6c32a0',
    route: '/report',
    countKey: null
  }
];

const STATUS_STYLES = {
  'Draft': { background: '#f0f0f0', color: '#666' },
  'Approved': { background: '#e8f5e9', color: '#107e3e' },
  'Rejected': { background: '#fce4ec', color: '#b00' },
  'Pending MSV Approval': { background: '#fff3e0', color: '#b26000' },
  'Pending E&M Approval': { background: '#e3f2fd', color: '#0070f2' }
};

function FioriTile({ tile, count, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#f5f8ff' : 'white',
        border: `1px solid ${hovered ? tile.accentColor : '#e0e0e0'}`,
        borderTop: `4px solid ${tile.accentColor}`,
        borderRadius: '0.5rem',
        padding: '1.25rem 1.25rem 1rem',
        cursor: 'pointer',
        minHeight: '150px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: hovered
          ? `0 4px 16px ${tile.accentColor}25`
          : '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'all 0.15s ease',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      {/* Count badge top-right */}
      {count > 0 && (
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: tile.accentColor,
          color: 'white',
          borderRadius: '1rem',
          padding: '0.15rem 0.55rem',
          fontSize: '0.78rem',
          fontWeight: 700,
          minWidth: '22px',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          {count}
        </div>
      )}

      {/* Icon */}
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '10px',
        background: `${tile.accentColor}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.75rem'
      }}>
        <Icon
          name={tile.icon}
          style={{ fontSize: '1.4rem', color: tile.accentColor }}
        />
      </div>

      {/* Text */}
      <div>
        <div style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#32363a',
          marginBottom: '0.3rem',
          lineHeight: 1.3
        }}>
          {tile.title}
        </div>
        <div style={{
          fontSize: '0.78rem',
          color: '#6a6d70',
          lineHeight: 1.4
        }}>
          {tile.subtitle}
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="page-container">
      {/* Welcome header */}
      <div style={{ marginBottom: '2rem', paddingTop: '0.5rem' }}>
        <Title level="H2">Welcome, {currentUser?.displayName}</Title>
        <Text style={{ color: '#6a6d70' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </div>

      {/* Fiori-style tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2.5rem'
      }}>
        {tiles.map(tile => (
          <FioriTile
            key={tile.id}
            tile={tile}
            count={tile.countKey ? counts[tile.countKey] || 0 : 0}
            onClick={() => navigate(tile.route)}
          />
        ))}
      </div>

      {/* Recent Documents */}
      {recentDocs.length > 0 && (
        <div>
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
                    style={{ cursor: 'pointer', transition: 'background 0.1s', borderBottom: '1px solid #f0f0f0' }}
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
                        ...(STATUS_STYLES[doc.status] || {}),
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
