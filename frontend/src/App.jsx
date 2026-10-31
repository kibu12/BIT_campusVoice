import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import ReportIssuePage from './pages/ReportIssuePage';
import ContactsPage from './pages/ContactsPage';
import AdminPage from './pages/AdminPage';
import CampusMapPage from './pages/CampusMapPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors duration-200">
          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Default Redirect to Chat if logged in, or Login */}
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/emergency" element={<ContactsPage />} />
              <Route path="/map" element={<CampusMapPage />} />
              
              {/* Protected Routes for Student & Guest */}
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/report" 
                element={
                  <ProtectedRoute>
                    <ReportIssuePage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin Route */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminPage />
                  </ProtectedRoute>
                } 
              />

              {/* Catch all fallback */}
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
