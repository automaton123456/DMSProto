import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    displayName: user.displayName || user.display_name || user.username || '',
    role: (user.role || 'user').toLowerCase().trim()
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => {
        const normalizedUsers = (Array.isArray(data) ? data : []).map(normalizeUser);
        setUsers(normalizedUsers);
        const saved = sessionStorage.getItem('dms_rb_user');
        if (saved) {
          const savedUser = normalizedUsers.find(u => u.username === saved);
          if (savedUser) setCurrentUser(savedUser);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const login = (username) => {
    return fetch(`/api/users/${username}`)
      .then(r => r.json())
      .then(user => {
        setCurrentUser(normalizeUser(user));
        sessionStorage.setItem('dms_rb_user', username);
      });
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('dms_rb_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
