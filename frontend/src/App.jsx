import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import {
  Home, MessageSquare, FileText, BarChart3, Lightbulb, FolderOpen, Upload,
  Settings, User, LogOut, Menu, X, Brain, Activity, Network, Zap, Users
} from 'lucide-react';

// Simple navigation item component
const NavItem = ({ to, icon: Icon, children, end = false }) => {
  const location = useLocation();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
  
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-white/20 text-white'
          : 'text-white/90 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1">{children}</span>
    </Link>
  );
};

// Dashboard component
const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-charcoal-600 to-charcoal-700 rounded-xl shadow-lg text-white p-6">
        <h1 className="text-3xl font-bold mb-2">Pulse One Dashboard</h1>
        <p className="text-charcoal-100">
          AI-powered orchestration layer for your entire HR ecosystem
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Connected Modules</p>
              <p className="text-2xl font-semibold text-gray-900">1</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Documents Processed</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <div className="w-6 h-6 bg-purple-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">RAG Queries</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <div className="w-6 h-6 bg-orange-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sync Status</p>
              <p className="text-2xl font-semibold text-gray-900">100%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome to Pulse One</h2>
        <p className="text-gray-600">
          This is your AI-powered orchestration platform. The system is currently being set up.
        </p>
      </div>
    </div>
  );
};

// Placeholder page component
const PlaceholderPage = ({ title, description, icon: Icon }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <Icon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500">This feature is under development.</p>
      </div>
    </div>
  );
};

// Main layout with sidebar
const MainLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-charcoal-500 to-charcoal-600 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 md:z-0`}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-charcoal-500">
              <span className="text-lg font-bold">P1</span>
            </div>
            <span className="text-xl font-bold text-white">Pulse One</span>
          </Link>
        </div>

        <div className="flex-1 overflow-auto py-6 px-4">
          <nav className="flex flex-col gap-1">
            <NavItem to="/" icon={Home} end={true}>Dashboard</NavItem>

            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              InsightsHub
            </div>
            <NavItem to="/chat" icon={MessageSquare}>Chat Assistant</NavItem>
            <NavItem to="/reports" icon={FileText}>AI Reports</NavItem>
            <NavItem to="/analytics" icon={BarChart3}>Analytics</NavItem>
            <NavItem to="/recommendations" icon={Lightbulb}>AI Recommendations</NavItem>

            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              ContextHub
            </div>
            <NavItem to="/library" icon={FolderOpen}>Company Library</NavItem>
            <NavItem to="/knowledge-feed" icon={Upload}>Knowledge Feed</NavItem>

            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              OrchestrationHub
            </div>
            <NavItem to="/connections" icon={Network}>Data Connections</NavItem>
            <NavItem to="/rag-management" icon={Brain}>RAG Management</NavItem>
            <NavItem to="/sync-monitoring" icon={Activity}>Sync Monitoring</NavItem>

            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              System
            </div>
            <NavItem to="/ai-configuration" icon={Zap}>AI Configuration</NavItem>
            <NavItem to="/user-management" icon={Users}>User Management</NavItem>
            <NavItem to="/settings" icon={Settings}>Settings</NavItem>
          </nav>
        </div>

        <div className="mt-auto border-t border-white/10 p-4 flex justify-center items-center">
          <div className="text-white/80 text-sm flex items-center">
            <span className="mr-2">AI powered by</span>
            <a href="https://runonflux.com" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <span className="text-white font-semibold">Flux</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 md:ml-64">
        {/* Header for mobile */}
        <header className="sticky top-0 z-40 flex h-16 items-center bg-white shadow-sm md:hidden">
          <div className="flex items-center justify-between w-full px-4">
            <button
              onClick={toggleSidebar}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            >
              {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-charcoal-500 to-charcoal-600 text-white">
                <span className="text-lg font-bold">P1</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Pulse One</span>
            </div>
            
            <div className="w-8"></div> {/* Spacer */}
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="w-1/3"></div>
          <div className="w-1/3 flex justify-center">
            <h1 className="text-lg font-semibold text-gray-800">Pulse One</h1>
          </div>
          <div className="w-1/3 flex items-center justify-end gap-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="h-9 w-9 rounded-full bg-charcoal-100 flex items-center justify-center text-charcoal-600 font-medium hover:bg-charcoal-200 transition-colors"
              >
                <User className="h-5 w-5" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">Admin User</p>
                      <p className="text-xs text-gray-500">admin@pulseone.com</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="grid grid-cols-3 items-center px-4 md:px-6 py-2 text-xs text-gray-500 bg-white border-t border-gray-200">
          <span></span> 
          <span className="text-center">v1.0.0 — Genesis</span>
          <span className="text-right">© {new Date().getFullYear()} Pulse One</span>
        </footer>
      </div>

      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-charcoal-200 border-t-charcoal-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading Pulse One...</p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </PrivateRoute>
        } />
        
        {/* Placeholder routes */}
        <Route path="/chat" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="AI Chat Assistant" description="Powered by advanced RAG technology and Flux AI" icon={MessageSquare} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/reports" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="AI Reports" description="Generate insights, policies, and documentation with AI" icon={FileText} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="Analytics Dashboard" description="Cross-module insights and performance metrics" icon={BarChart3} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/recommendations" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="AI Recommendations" description="Proactive insights and suggestions powered by AI analysis" icon={Lightbulb} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/library" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="Company Library" description="Manage and explore your organization's knowledge base" icon={FolderOpen} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/knowledge-feed" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="Knowledge Feed" description="Upload and organize documents to build your AI-powered knowledge base" icon={Upload} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/connections" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="Data Connections" description="Manage integrations with Pulse modules and external systems" icon={Network} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/rag-management" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="RAG Management" description="Monitor and optimize document processing, embeddings, and AI retrieval" icon={Brain} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/sync-monitoring" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="Sync Monitoring" description="Monitor data synchronization across all connected systems" icon={Activity} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/ai-configuration" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="AI Configuration" description="Configure Flux AI models, behavior settings, and performance parameters" icon={Zap} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/user-management" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="User Management" description="Manage user accounts and permissions" icon={Users} />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute>
            <MainLayout>
              <PlaceholderPage title="Settings" description="Configure your Pulse One application" icon={Settings} />
            </MainLayout>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;