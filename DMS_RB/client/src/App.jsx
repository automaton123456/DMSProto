import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import NavbarLayout from './components/NavbarLayout.jsx';
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
          <NavbarLayout><HomePage /></NavbarLayout>
        </ProtectedRoute>
      } />
      <Route path="/documents/new" element={
        <ProtectedRoute>
          <NavbarLayout><DocumentForm mode="create" /></NavbarLayout>
        </ProtectedRoute>
      } />
      <Route path="/documents/:id" element={
        <ProtectedRoute>
          <NavbarLayout><DocumentForm mode="view" /></NavbarLayout>
        </ProtectedRoute>
      } />
      <Route path="/documents/:id/approve" element={
        <ProtectedRoute>
          <NavbarLayout><DocumentForm mode="approve" /></NavbarLayout>
        </ProtectedRoute>
      } />
      <Route path="/inbox" element={
        <ProtectedRoute>
          <NavbarLayout><Inbox /></NavbarLayout>
        </ProtectedRoute>
      } />
      <Route path="/my-documents" element={
        <ProtectedRoute>
          <NavbarLayout><MyDocuments /></NavbarLayout>
        </ProtectedRoute>
      } />
      <Route path="/report" element={
        <ProtectedRoute>
          <NavbarLayout><Report /></NavbarLayout>
        </ProtectedRoute>
      } />
      <Route path="/completed-report" element={
        <ProtectedRoute>
          <NavbarLayout><Report completedOnly /></NavbarLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <NavbarLayout><Admin /></NavbarLayout>
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
