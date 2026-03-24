import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Icon from '@mdi/react';
import {
  mdiHome, mdiTrayDownload, mdiFilePlusOutline, mdiFileDocumentMultipleOutline,
  mdiMagnify, mdiCogOutline, mdiBellOutline, mdiLogoutVariant, mdiAccountCircleOutline
} from '@mdi/js';
import { useAuth } from '../context/AuthContext.jsx';

const HP_LOGO_SVG = (
  <svg width="44" height="30" viewBox="0 0 1571 1074" xmlns="http://www.w3.org/2000/svg">
    <path d="m1453.5 1074h-1335c-15.4 0.1-30.6-2.9-44.9-8.8-14.2-5.8-27.1-14.4-38.1-25.3-10.9-10.8-19.5-23.7-25.5-38-5.9-14.2-9-29.4-9-44.8v-840.2c0-15.4 3.1-30.6 9-44.8 6-14.3 14.6-27.2 25.5-38 11-10.9 23.9-19.5 38.1-25.3 14.3-5.9 29.5-8.9 44.9-8.8h1335c15.3-0.1 30.6 2.9 44.8 8.8 14.3 5.8 27.2 14.4 38.1 25.3 11 10.8 19.6 23.7 25.6 38 5.9 14.2 9 29.4 9 44.8v840.2c0 15.4-3.1 30.6-9 44.8-6 14.3-14.6 27.2-25.6 38-10.9 10.9-23.8 19.5-38.1 25.3-14.2 5.9-29.5 8.9-44.8 8.8z" fill="#2b5597"/>
    <path fillRule="evenodd" d="m1297.4 155.3c9 0.2 17.9 2.2 26.2 5.8 8.2 3.6 15.7 8.8 22 15.3 6.3 6.5 11.3 14.1 14.7 22.5 3.4 8.3 5.1 17.3 5.1 26.3v366.6c0 9.1-1.8 18.2-5.3 26.7-3.5 8.5-8.6 16.2-15.1 22.7-6.5 6.5-14.2 11.6-22.6 15.1-8.5 3.6-17.6 5.4-26.8 5.4h-168.1v71.8h60.6v185.1h-291.6v-185.1h51.5v-80.3l-3.6 2.1q-3.9 2.6-7.8 5.1-3.9 2.4-7.9 4.7-9.1 5.3-18.4 10.3-4.8 2.6-9.7 4.9-10.9 5.4-22.3 9.9c-6.9 2.8-13.9 5.2-21 7.4q-2.2 0.6-4.5 1.2-2.2 0.7-4.5 1.2-2.3 0.5-4.6 1-2.3 0.5-4.6 0.9-2 0.3-4 0.6-2.1 0.3-4.2 0.6-2 0.2-4.1 0.4-2 0.2-4.1 0.3-4 0.3-8.1 0.4-4 0-8.1-0.1-4-0.1-8-0.4-4.1-0.3-8.1-0.7-1.3-0.2-2.7-0.4c-1.3-0.2-2.5-0.4-3.8-0.7v31.7h51.8v185h-288.7v-185h51.7v-132.2h-155.1v132.2h51.7v185.1h-288.6v-185.1h51.7v-371.6h-51.7v-206.7h288.6v206.7h-51.7v132.2h155.1v-132.2h-51.7v-206.7h288.5v206.7h-51.7v119.5l1.1-0.6 0.9-0.5q1.7-1.2 3.5-2.3c1.8-1.1 3.6-2.2 5.6-3.2q4.8-2.7 9.8-5.3c4.9-2.5 9.9-5 15-7.5q10.2-4.9 20.6-9.6 11.8-5.7 23.8-10.7 12.1-5 24.2-9.7 10.4-4.2 20.8-8.1 7.5-2.8 15-5.4c3.3-1.1 6.7-2.2 10-3.2q3.3-1 6.7-2 2.4-0.7 4.9-1.2l2-0.5v20.2l3.9-1.2 6.5-1.9 3.9-1.2c0.8-0.3 1.8-0.6 2.8-0.9q1.6-0.5 3.2-0.9 4.5-1.3 8.9-2.4 5.3-1.3 10.7-2.4 1.8-0.4 3.7-0.7l2.1-0.3h0.7v-49.7h-51.7v-206.7h400.8m-519.6 469.3l0.2-0.1v0.1l-0.2 0.1zm240-231.9c0-4.1-0.8-8-2.3-11.8-1.6-3.7-3.8-7.1-6.7-9.9-2.8-2.9-6.2-5.1-9.9-6.7-3.7-1.5-7.7-2.3-11.8-2.3h-29.9v222.6h30c4 0 8-0.8 11.7-2.4 3.8-1.5 7.1-3.8 10-6.6 2.8-2.9 5.1-6.3 6.6-10 1.6-3.7 2.4-7.7 2.4-11.7z" fill="#ffffff"/>
    <path fillRule="evenodd" d="m1446.2 1022.2h-1320.3c-9.6 0-19-1.9-27.8-5.6-8.8-3.6-16.8-9-23.6-15.7-6.7-6.8-12.1-14.8-15.7-23.6-3.7-8.8-5.5-18.2-5.5-27.8l0.2-824.5c0-9.6 1.9-19 5.5-27.8 3.7-8.8 9-16.8 15.7-23.6 6.8-6.7 14.8-12 23.6-15.7 8.8-3.7 18.2-5.6 27.7-5.6l1320.1-0.5c9.5 0 19 1.9 27.8 5.5 8.8 3.7 16.8 9 23.5 15.8 6.8 6.7 12.1 14.7 15.8 23.5 3.6 8.8 5.5 18.3 5.5 27.8v825.1c0 9.5-1.9 18.9-5.5 27.7-3.7 8.8-9 16.8-15.8 23.6-6.7 6.7-14.7 12.1-23.5 15.7-8.8 3.7-18.3 5.6-27.7 5.7zm-1320.2-943.2c-6 0-11.9 1.2-17.5 3.5-5.6 2.3-10.6 5.7-14.9 10-4.2 4.2-7.6 9.3-9.9 14.8-2.3 5.6-3.5 11.6-3.5 17.6l-0.2 824.6c0 6 1.2 12 3.5 17.5 2.3 5.6 5.7 10.7 9.9 14.9 4.3 4.3 9.3 7.7 14.9 10 5.6 2.3 11.5 3.5 17.6 3.5h1320.3c6 0 11.9-1.2 17.5-3.5 5.6-2.3 10.6-5.7 14.9-10 4.2-4.3 7.6-9.3 9.9-14.9 2.3-5.6 3.5-11.5 3.5-17.5v-825c0-6-1.2-12-3.5-17.5-2.3-5.6-5.6-10.7-9.9-14.9-4.3-4.3-9.3-7.7-14.9-10-5.6-2.3-11.5-3.5-17.5-3.5z" fill="#ffffff"/>
  </svg>
);

export default function NavbarLayout({ children }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

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
  const isActive = (path) => location.pathname === path ? 'nav-link active fw-semibold' : 'nav-link';

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="primary" variant="dark" expand="lg" sticky="top" className="px-3 py-2 shadow-sm">
        <Navbar.Brand onClick={() => navigate('/')} style={{ cursor: 'pointer' }} className="d-flex align-items-center gap-3">
          {HP_LOGO_SVG}
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.1 }}>DMS Proto</div>
            <div style={{ fontSize: '0.68rem', opacity: 0.8, lineHeight: 1.1 }}>Document Management System</div>
          </div>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" />

        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto ms-3">
            <Nav.Link className={isActive('/')} onClick={() => navigate('/')}>
              <Icon path={mdiHome} size={0.7} className="me-1" />Home
            </Nav.Link>
            <Nav.Link className={isActive('/inbox')} onClick={() => navigate('/inbox')}>
              <Icon path={mdiTrayDownload} size={0.7} className="me-1" />Inbox
              {unreadCount > 0 && (
                <Badge bg="warning" text="dark" className="ms-1" style={{ fontSize: '0.62rem' }}>{unreadCount}</Badge>
              )}
            </Nav.Link>
            <Nav.Link className={isActive('/documents/new')} onClick={() => navigate('/documents/new')}>
              <Icon path={mdiFilePlusOutline} size={0.7} className="me-1" />New Document
            </Nav.Link>
            <Nav.Link className={isActive('/my-documents')} onClick={() => navigate('/my-documents')}>
              <Icon path={mdiFileDocumentMultipleOutline} size={0.7} className="me-1" />My Documents
            </Nav.Link>
            <Nav.Link className={isActive('/report')} onClick={() => navigate('/report')}>
              <Icon path={mdiMagnify} size={0.7} className="me-1" />Report
            </Nav.Link>
            {currentUser?.role === 'admin' && (
              <Nav.Link className={isActive('/admin')} onClick={() => navigate('/admin')}>
                <Icon path={mdiCogOutline} size={0.7} className="me-1" />Admin
              </Nav.Link>
            )}
          </Nav>

          <Nav className="align-items-center gap-2">
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <Button variant="outline-light" size="sm" onClick={() => setShowNotifs(!showNotifs)} style={{ position: 'relative' }}>
                <Icon path={mdiBellOutline} size={0.75} />
                {unreadCount > 0 && (
                  <Badge bg="danger" style={{ position: 'absolute', top: '-6px', right: '-6px', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '10px' }}>
                    {unreadCount}
                  </Badge>
                )}
              </Button>

              {showNotifs && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 1040 }} onClick={() => setShowNotifs(false)} />
                  <div style={{
                    position: 'absolute', right: 0, top: '2.5rem', width: '360px',
                    background: 'var(--bs-body-bg)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    borderRadius: '0.5rem', zIndex: 1050, maxHeight: '480px',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    border: '1px solid var(--bs-border-color)'
                  }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--bs-border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="fw-semibold" style={{ fontSize: '0.875rem' }}>
                        Notifications{' '}
                        {unreadCount > 0 && <Badge bg="primary" style={{ fontSize: '0.7rem' }}>{unreadCount}</Badge>}
                      </span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="btn btn-link btn-sm p-0 text-primary" style={{ fontSize: '0.8rem' }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {notifications.length === 0 ? (
                        <div className="text-muted text-center" style={{ padding: '2rem', fontSize: '0.875rem' }}>No notifications</div>
                      ) : (
                        notifications.slice(0, 20).map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            style={{
                              padding: '0.65rem 1rem', borderBottom: '1px solid var(--bs-border-color-translucent)',
                              cursor: 'pointer',
                              background: n.read ? 'var(--bs-body-bg)' : 'var(--bs-primary-bg-subtle)',
                              borderLeft: n.read ? '3px solid transparent' : '3px solid var(--bs-primary)'
                            }}
                          >
                            <div style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>{n.message}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User dropdown */}
            <NavDropdown
              title={
                <span className="d-inline-flex align-items-center gap-2">
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'white' }}>
                    {initials}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'white' }}>{currentUser?.displayName?.split(' ')[0]}</span>
                </span>
              }
              id="user-dropdown"
              align="end"
            >
              <NavDropdown.Header>
                <div className="fw-semibold">{currentUser?.displayName}</div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{currentUser?.role?.toUpperCase()}</div>
              </NavDropdown.Header>
              <NavDropdown.Divider />
              {currentUser?.role === 'admin' && (
                <NavDropdown.Item onClick={() => navigate('/admin')}>
                  <Icon path={mdiCogOutline} size={0.7} className="me-2" />Administration
                </NavDropdown.Item>
              )}
              <NavDropdown.Item onClick={() => { logout(); navigate('/login'); }} className="text-danger">
                <Icon path={mdiLogoutVariant} size={0.7} className="me-2" />Sign Out
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Navbar>

      <main className="flex-grow-1">{children}</main>
    </div>
  );
}
