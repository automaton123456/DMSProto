import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShellBar,
  ShellBarItem,
  Tag,
  Avatar
} from '@ui5/webcomponents-react';
import { useAuth } from '../context/AuthContext.jsx';

// HP company logo SVG (scaled for ShellBar)
const HP_LOGO = (
  <svg slot="logo" width="52" height="36" viewBox="0 0 1571 1074" xmlns="http://www.w3.org/2000/svg">
    <path d="m1453.5 1074h-1335c-15.4 0.1-30.6-2.9-44.9-8.8-14.2-5.8-27.1-14.4-38.1-25.3-10.9-10.8-19.5-23.7-25.5-38-5.9-14.2-9-29.4-9-44.8v-840.2c0-15.4 3.1-30.6 9-44.8 6-14.3 14.6-27.2 25.5-38 11-10.9 23.9-19.5 38.1-25.3 14.3-5.9 29.5-8.9 44.9-8.8h1335c15.3-0.1 30.6 2.9 44.8 8.8 14.3 5.8 27.2 14.4 38.1 25.3 11 10.8 19.6 23.7 25.6 38 5.9 14.2 9 29.4 9 44.8v840.2c0 15.4-3.1 30.6-9 44.8-6 14.3-14.6 27.2-25.6 38-10.9 10.9-23.8 19.5-38.1 25.3-14.2 5.9-29.5 8.9-44.8 8.8z" fill="#2b5597"/>
    <path fillRule="evenodd" d="m1297.4 155.3c9 0.2 17.9 2.2 26.2 5.8 8.2 3.6 15.7 8.8 22 15.3 6.3 6.5 11.3 14.1 14.7 22.5 3.4 8.3 5.1 17.3 5.1 26.3v366.6c0 9.1-1.8 18.2-5.3 26.7-3.5 8.5-8.6 16.2-15.1 22.7-6.5 6.5-14.2 11.6-22.6 15.1-8.5 3.6-17.6 5.4-26.8 5.4h-168.1v71.8h60.6v185.1h-291.6v-185.1h51.5v-80.3l-3.6 2.1q-3.9 2.6-7.8 5.1-3.9 2.4-7.9 4.7-9.1 5.3-18.4 10.3-4.8 2.6-9.7 4.9-10.9 5.4-22.3 9.9c-6.9 2.8-13.9 5.2-21 7.4q-2.2 0.6-4.5 1.2-2.2 0.7-4.5 1.2-2.3 0.5-4.6 1-2.3 0.5-4.6 0.9-2 0.3-4 0.6-2.1 0.3-4.2 0.6-2 0.2-4.1 0.4-2 0.2-4.1 0.3-4 0.3-8.1 0.4-4 0-8.1-0.1-4-0.1-8-0.4-4.1-0.3-8.1-0.7-1.3-0.2-2.7-0.4c-1.3-0.2-2.5-0.4-3.8-0.7v31.7h51.8v185h-288.7v-185h51.7v-132.2h-155.1v132.2h51.7v185.1h-288.6v-185.1h51.7v-371.6h-51.7v-206.7h288.6v206.7h-51.7v132.2h155.1v-132.2h-51.7v-206.7h288.5v206.7h-51.7v119.5l1.1-0.6 0.9-0.5q1.7-1.2 3.5-2.3c1.8-1.1 3.6-2.2 5.6-3.2q4.8-2.7 9.8-5.3c4.9-2.5 9.9-5 15-7.5q10.2-4.9 20.6-9.6 11.8-5.7 23.8-10.7 12.1-5 24.2-9.7 10.4-4.2 20.8-8.1 7.5-2.8 15-5.4c3.3-1.1 6.7-2.2 10-3.2q3.3-1 6.7-2 2.4-0.7 4.9-1.2l2-0.5v20.2l3.9-1.2 6.5-1.9 3.9-1.2c0.8-0.3 1.8-0.6 2.8-0.9q1.6-0.5 3.2-0.9 4.5-1.3 8.9-2.4 5.3-1.3 10.7-2.4 1.8-0.4 3.7-0.7l2.1-0.3h0.7v-49.7h-51.7v-206.7h400.8m-519.6 469.3l0.2-0.1v0.1l-0.2 0.1zm240-231.9c0-4.1-0.8-8-2.3-11.8-1.6-3.7-3.8-7.1-6.7-9.9-2.8-2.9-6.2-5.1-9.9-6.7-3.7-1.5-7.7-2.3-11.8-2.3h-29.9v222.6h30c4 0 8-0.8 11.7-2.4 3.8-1.5 7.1-3.8 10-6.6 2.8-2.9 5.1-6.3 6.6-10 1.6-3.7 2.4-7.7 2.4-11.7z" fill="#ffffff"/>
    <path fillRule="evenodd" d="m1446.2 1022.2h-1320.3c-9.6 0-19-1.9-27.8-5.6-8.8-3.6-16.8-9-23.6-15.7-6.7-6.8-12.1-14.8-15.7-23.6-3.7-8.8-5.5-18.2-5.5-27.8l0.2-824.5c0-9.6 1.9-19 5.5-27.8 3.7-8.8 9-16.8 15.7-23.6 6.8-6.7 14.8-12 23.6-15.7 8.8-3.7 18.2-5.6 27.7-5.6l1320.1-0.5c9.5 0 19 1.9 27.8 5.5 8.8 3.7 16.8 9 23.5 15.8 6.8 6.7 12.1 14.7 15.8 23.5 3.6 8.8 5.5 18.3 5.5 27.8v825.1c0 9.5-1.9 18.9-5.5 27.7-3.7 8.8-9 16.8-15.8 23.6-6.7 6.7-14.7 12.1-23.5 15.7-8.8 3.7-18.3 5.6-27.7 5.7zm-1320.2-943.2c-6 0-11.9 1.2-17.5 3.5-5.6 2.3-10.6 5.7-14.9 10-4.2 4.2-7.6 9.3-9.9 14.8-2.3 5.6-3.5 11.6-3.5 17.6l-0.2 824.6c0 6 1.2 12 3.5 17.5 2.3 5.6 5.7 10.7 9.9 14.9 4.3 4.3 9.3 7.7 14.9 10 5.6 2.3 11.5 3.5 17.6 3.5h1320.3c6 0 11.9-1.2 17.5-3.5 5.6-2.3 10.6-5.7 14.9-10 4.2-4.3 7.6-9.3 9.9-14.9 2.3-5.6 3.5-11.5 3.5-17.5v-825c0-6-1.2-12-3.5-17.5-2.3-5.6-5.6-10.7-9.9-14.9-4.3-4.3-9.3-7.7-14.9-10-5.6-2.3-11.5-3.5-17.5-3.5z" fill="#ffffff"/>
  </svg>
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
