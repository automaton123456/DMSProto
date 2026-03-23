import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShellBar,
  ShellBarItem,
  Tag,
  Avatar
} from '@ui5/webcomponents-react';
import { useAuth } from '../context/AuthContext.jsx';
import hpLogoUrl from '../assets/hp-logo.svg';

// HP company logo (wrapped in div — SVGElement is not instanceof HTMLElement, div is)
const HP_LOGO = (
  <div slot="logo" style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
    <img src={hpLogoUrl} alt="HP Logo" width="52" height="36" />
  </div>
);

export default function ShellLayout({ children }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/notifications?currentUser=${currentUser.username}`)
      .then(r => r.json())
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [currentUser, location.pathname]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifClick = (notif) => {
    fetch(`/api/notifications/${notif.id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    if (notif.link) navigate(notif.link);
    setShowNotifs(false);
  };

  const markAllRead = () => {
    fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUser: currentUser.username })
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const initials = currentUser?.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ShellBar
        primaryTitle="DMS Proto"
        secondaryTitle="Document Management System"
        onLogoClick={() => navigate('/')}
        onProfileClick={() => setShowUserMenu(!showUserMenu)}
        notificationsCount={unreadCount > 0 ? String(unreadCount) : undefined}
        onNotificationsClick={() => setShowNotifs(!showNotifs)}
      >
        {HP_LOGO}
        <Avatar slot="profile" size="XS" initials={initials} colorScheme="Accent6" style={{ cursor: 'pointer' }} />
        <ShellBarItem icon="home" text="Home" onClick={() => navigate('/')} />
        <ShellBarItem icon="inbox" text="Inbox" onClick={() => navigate('/inbox')} />
        <ShellBarItem icon="add-document" text="New Document" onClick={() => navigate('/documents/new')} />
        <ShellBarItem icon="document-text" text="My Documents" onClick={() => navigate('/my-documents')} />
        <ShellBarItem icon="search" text="Report" onClick={() => navigate('/report')} />
        {currentUser?.role === 'admin' && (
          <ShellBarItem icon="action-settings" text="Admin Panel" onClick={() => navigate('/admin')} />
        )}
      </ShellBar>

      {/* Notifications Popover */}
      {showNotifs && (
        <div style={{
          position: 'fixed', top: '3rem', right: '1rem', width: '360px',
          background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          borderRadius: '0.5rem', zIndex: 1000, maxHeight: '480px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Notifications {unreadCount > 0 && <Tag colorScheme="6">{unreadCount}</Tag>}
            </span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0070f2', fontSize: '0.8rem' }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6a6d70', fontSize: '0.9rem' }}>No notifications</div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n.id} onClick={() => handleNotifClick(n)} style={{
                  padding: '0.75rem 1rem', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                  background: n.read ? 'white' : '#f0f7ff',
                  borderLeft: n.read ? '3px solid transparent' : '3px solid #0070f2'
                }}>
                  <div style={{ fontSize: '0.83rem', color: '#32363a', marginBottom: '0.25rem' }}>{n.message}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6a6d70' }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* User menu */}
      {showUserMenu && (
        <div style={{
          position: 'fixed', top: '3rem', right: '0.5rem', background: 'white',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', borderRadius: '0.5rem',
          zIndex: 1000, minWidth: '220px', padding: '0.5rem 0'
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e8e8' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentUser?.displayName}</div>
            <div style={{ fontSize: '0.75rem', color: '#6a6d70', marginTop: '0.15rem' }}>{currentUser?.role?.toUpperCase()}</div>
          </div>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => { setShowUserMenu(false); navigate('/admin'); }}
              style={{ width: '100%', padding: '0.65rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', color: '#32363a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span>⚙</span> Administration
            </button>
          )}
          <button
            onClick={() => { setShowUserMenu(false); logout(); navigate('/login'); }}
            style={{ width: '100%', padding: '0.65rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', color: '#b00', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span>→</span> Sign Out
          </button>
        </div>
      )}

      {/* Click outside to close overlays */}
      {(showNotifs || showUserMenu) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => { setShowNotifs(false); setShowUserMenu(false); }} />
      )}

      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
