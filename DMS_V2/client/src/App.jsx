import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ShellLayout from './components/ShellLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import DocumentForm from './pages/DocumentForm.jsx';
import Inbox from './pages/Inbox.jsx';
import MyDocuments from './pages/MyDocuments.jsx';
import Report from './pages/Report.jsx';
import Admin from './pages/Admin.jsx';

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { currentUser } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <ShellLayout>
            <HomePage />
          </ShellLayout>
        </ProtectedRoute>
      } />
      <Route path="/documents/new" element={
        <ProtectedRoute>
          <ShellLayout>
            <DocumentForm mode="create" />
          </ShellLayout>
        </ProtectedRoute>
      } />
      <Route path="/documents/:id" element={
        <ProtectedRoute>
          <ShellLayout>
            <DocumentForm mode="view" />
          </ShellLayout>
        </ProtectedRoute>
      } />
      <Route path="/documents/:id/approve" element={
        <ProtectedRoute>
          <ShellLayout>
            <DocumentForm mode="approve" />
          </ShellLayout>
        </ProtectedRoute>
      } />
      <Route path="/inbox" element={
        <ProtectedRoute>
          <ShellLayout>
            <Inbox />
          </ShellLayout>
        </ProtectedRoute>
      } />
      <Route path="/my-documents" element={
        <ProtectedRoute>
          <ShellLayout>
            <MyDocuments />
          </ShellLayout>
        </ProtectedRoute>
      } />
      <Route path="/report" element={
        <ProtectedRoute>
          <ShellLayout>
            <Report />
          </ShellLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <ShellLayout>
            <Admin />
          </ShellLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
