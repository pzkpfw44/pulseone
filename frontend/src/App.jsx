// frontend/src/App.jsx

import React, { useState, useEffect } from "react";
import api from "./services/api";
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import EnhancedDashboard from './pages/EnhancedDashboard';

// InsightsHub pages
import ChatAssistant from './pages/ChatAssistant';
import AiReports from './pages/AiReports';
import Analytics from './pages/Analytics';
import AiRecommendations from './pages/AiRecommendations';

// ContextHub pages
import CompanyLibrary from './pages/CompanyLibrary';
import EnhancedKnowledgeFeed from './pages/EnhancedKnowledgeFeed';

// OrchestrationHub pages
import DataConnections from './pages/DataConnections';
import RagManagement from './pages/RagManagement';
import SyncMonitoring from './pages/SyncMonitoring';

// System pages
import AiConfiguration from './pages/AiConfiguration';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';

import { MainLayout } from './components/layout/MainLayout';

// External routes that don't use MainLayout
const ExternalRoute = ({ children }) => {
  const path = window.location.pathname;
  const isExternal = path.startsWith('/external/');
  if (isExternal) return children;
  return <MainLayout>{children}</MainLayout>;
};

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [versionInfo, setVersionInfo] = useState(null);

  // Check API health
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        await api.get('/health');
        setLoading(false);
      } catch (err) {
        console.error('API connection error:', err);
        setError('Failed to connect to API. Please make sure the backend is running.');
        setLoading(false);
      }
    };
    checkApiStatus();
  }, []);

  // Fetch version + codename
  useEffect(() => {
    api.get('/version')
      .then(res => {
        const { version, codename } = res.data;
        setVersionInfo(`${version} — ${codename}`);
      })
      .catch(err => {
        console.error('Error fetching version:', err);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading Pulse One...</p>
        <p className="mt-2 text-sm text-gray-500">Initializing Enhanced Knowledge Feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <p className="font-medium">Connection Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route path="/" element={
          <PrivateRoute>
            <ExternalRoute>
              <EnhancedDashboard />
            </ExternalRoute>
          </PrivateRoute>
        } />

        {/* InsightsHub routes */}
        <Route path="/chat" element={
          <PrivateRoute>
            <ExternalRoute>
              <ChatAssistant />
            </ExternalRoute>
          </PrivateRoute>
        } />
        <Route path="/reports" element={
          <PrivateRoute>
            <ExternalRoute>
              <AiReports />
            </ExternalRoute>
          </PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute>
            <ExternalRoute>
              <Analytics />
            </ExternalRoute>
          </PrivateRoute>
        } />
        <Route path="/recommendations" element={
          <PrivateRoute>
            <ExternalRoute>
              <AiRecommendations />
            </ExternalRoute>
          </PrivateRoute>
        } />

        {/* ContextHub routes */}
        <Route path="/library" element={
          <PrivateRoute>
            <ExternalRoute>
              <CompanyLibrary />
            </ExternalRoute>
          </PrivateRoute>
        } />
        <Route path="/knowledge-feed" element={
          <PrivateRoute>
            <ExternalRoute>
              <EnhancedKnowledgeFeed />
            </ExternalRoute>
          </PrivateRoute>
        } />

        {/* OrchestrationHub routes */}
        <Route path="/connections" element={
          <PrivateRoute>
            <ExternalRoute>
              <DataConnections />
            </ExternalRoute>
          </PrivateRoute>
        } />
        <Route path="/rag-management" element={
          <PrivateRoute>
            <ExternalRoute>
              <RagManagement />
            </ExternalRoute>
          </PrivateRoute>
        } />
        <Route path="/sync-monitoring" element={
          <PrivateRoute>
            <ExternalRoute>
              <SyncMonitoring />
            </ExternalRoute>
          </PrivateRoute>
        } />

        {/* System routes */}
        <Route path="/ai-configuration" element={
          <PrivateRoute>
            <ExternalRoute>
              <AiConfiguration />
            </ExternalRoute>
          </PrivateRoute>
        } />
        <Route path="/user-management" element={
          <PrivateRoute>
            <ExternalRoute>
              <UserManagement />
            </ExternalRoute>
          </PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute>
            <ExternalRoute>
              <Settings />
            </ExternalRoute>
          </PrivateRoute>
        } />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </AuthProvider>
  );
}

export default App;