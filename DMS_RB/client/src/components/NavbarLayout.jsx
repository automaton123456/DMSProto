import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Icon from '@mdi/react';
import {
  mdiHome, mdiTrayArrowDown, mdiFilePlusOutline, mdiFileDocumentMultipleOutline,
  mdiMagnify, mdiCogOutline, mdiBellOutline, mdiLogoutVariant, mdiAccountCircleOutline
} from '@mdi/js';
import { useAuth } from '../context/AuthContext.jsx';
import brandLogo from '../assets/brand-logo.svg';

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
          <img src={brandLogo} alt="Brand logo" width="44" height="30" />
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
              <Icon path={mdiTrayArrowDown} size={0.7} className="me-1" />Inbox
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
