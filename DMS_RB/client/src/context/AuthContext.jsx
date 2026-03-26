import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => {
        setUsers(data);
        const saved = sessionStorage.getItem('dms_rb_user');
        if (saved) {
          const savedUser = data.find(u => u.username === saved);
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
        setCurrentUser(user);
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
