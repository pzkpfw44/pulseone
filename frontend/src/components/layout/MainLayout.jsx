import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  Home, Database, MessageSquare, BarChart3, Lightbulb, FolderOpen, Upload,
  Settings, Bell, User, LogOut, Menu, X, Brain, TrendingUp, Activity,
  Network, Gauge, Shield, Users, Zap, FileText, Search, Layers,
  HardDrive, Wifi, Monitor, Wrench
} from 'lucide-react';
import NotificationBell from '../ui/NotificationBell';
import api from "../../services/api";
import { useAuth } from '../../contexts/AuthContext';

// Sidebar navigation item component
const SidebarNavItem = ({ href, icon: Icon, title, badge, end = false, customActiveCheck }) => {
  const location = useLocation();
  
  const isActive = customActiveCheck ? customActiveCheck(location.pathname) : undefined;
  
  if (customActiveCheck) {
    return (
      <Link
        to={href}
        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-white/20 text-white'
            : 'text-white/90 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className="h-5 w-5" />
        <span className="flex-1">{title}</span>
        {badge && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-charcoal-600">
            {badge}
          </span>
        )}
      </Link>
    );
  }
  
  return (
    <NavLink
      to={href}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-white/20 text-white'
            : 'text-white/90 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1">{title}</span>
      {badge && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-charcoal-600">
          {badge}
        </span>
      )}
    </NavLink>
  );
};

export function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [brandingSettings, setBrandingSettings] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const [versionInfo, setVersionInfo] = useState(null);
  const [versionError, setVersionError] = useState('');

  // Fetch branding settings and apply them
  useEffect(() => {
    const fetchBrandingSettings = async () => {
      try {
        const cachedSettings = localStorage.getItem('brandingSettings');
        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings);
          setBrandingSettings(parsed);
          applyBrandingColors(parsed);
        }

        const response = await api.get('/settings/branding');
        if (response.data) {
          setBrandingSettings(response.data);
          applyBrandingColors(response.data);
          localStorage.setItem('brandingSettings', JSON.stringify(response.data));
        }
      } catch (error) {
        console.error('Error fetching branding settings:', error);
        // Apply default charcoal colors if branding settings fail
        applyBrandingColors({
          primaryColor: '#4B5563',
          secondaryColor: '#374151'
        });
      }
    };

    fetchBrandingSettings();
  }, []);

  const applyBrandingColors = (settings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.primaryColor || '#4B5563');
    root.style.setProperty('--secondary-color', settings.secondaryColor || '#374151');
    
    // Apply to other brand elements
    root.style.setProperty('--brand-primary', settings.primaryColor || '#4B5563');
    root.style.setProperty('--brand-secondary', settings.secondaryColor || '#374151');
  };

  // Fetch version information
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await api.get('/version');
        if (response && response.data && typeof response.data === 'object') {
          const { version, codename } = response.data;
          if (version !== undefined && codename !== undefined) {
            setVersionInfo({ version, codename });
            setVersionError('');
          } else {
            console.error('Version or codename missing in API response data:', response.data);
            setVersionError('Version info incomplete.');
            setVersionInfo(null);
          }
        } else {
          console.error('API response data for version is not an object or is missing:', response);
          setVersionError('Invalid version format.');
          setVersionInfo(null);
        }
      } catch (err) {
        console.error('Error fetching version:', err);
        let errorMessage = 'Could not load version.';
        if (err.response) {
          errorMessage += ` (Server: ${err.response.status})`;
        } else if (err.request) {
          errorMessage += ' (No response from server)';
        } else {
          errorMessage += ' (Request setup error)';
        }
        setVersionError(errorMessage);
        setVersionInfo(null);
      }
    };

    fetchVersion();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.getElementById('sidebar-container');
      const userMenu = document.getElementById('user-menu');
      
      if (sidebar && !sidebar.contains(event.target) && window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
      
      if (userMenu && !userMenu.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const companyName = brandingSettings?.companyName || '';

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar with dynamic branding colors */}
      <aside
        id="sidebar-container"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 md:z-0`}
        style={{
          background: `linear-gradient(to bottom, var(--primary-color), var(--secondary-color))`
        }}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white" 
                 style={{ color: 'var(--primary-color)' }}>
              <span className="text-lg font-bold">P1</span>
            </div>
            <span className="text-xl font-bold text-white">Pulse One</span>
          </Link>
        </div>

        <div className="flex-1 overflow-auto py-6 px-4">
          <nav className="flex flex-col gap-1">
            <SidebarNavItem href="/" icon={Home} title="Dashboard" end={true} />

            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              InsightsHub
            </div>
            <SidebarNavItem href="/chat" icon={MessageSquare} title="Chat Assistant" />
            <SidebarNavItem href="/ai-content-studio" icon={FileText} title="AI Content Studio" />
            <SidebarNavItem href="/recommendations" icon={Lightbulb} title="AI Recommendations" />

            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              ContextHub
            </div>
            <SidebarNavItem href="/library" icon={FolderOpen} title="Company Library" />
            <SidebarNavItem href="/knowledge-feed" icon={Upload} title="Knowledge Feed" />

            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              OrchestrationHub
            </div>
            <SidebarNavItem href="/connections" icon={Network} title="Data Connections" />
            <SidebarNavItem href="/rag-management" icon={Brain} title="RAG Management" />
            <SidebarNavItem href="/sync-monitoring" icon={Activity} title="Sync Monitoring" />

            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              System
            </div>
            <SidebarNavItem href="/ai-configuration" icon={Zap} title="AI Configuration" />
            <SidebarNavItem href="/user-management" icon={Users} title="User Management" />
            <SidebarNavItem href="/settings" icon={Settings} title="Settings" />
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
              {isSidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                   style={{ background: `linear-gradient(to right, var(--primary-color), var(--secondary-color))` }}>
                <span className="text-lg font-bold">P1</span>
              </div>
              <span className="text-xl font-bold" 
                    style={{ 
                      background: `linear-gradient(to right, var(--primary-color), var(--secondary-color))`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                {companyName}
              </span>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="w-1/3">
            {/* Empty space for balance */}
          </div>
          <div className="w-1/3 flex justify-center">
            <h1 className="text-lg font-semibold text-gray-800">
              {companyName}
            </h1>
          </div>
          <div className="w-1/3 flex items-center justify-end gap-4">
            <NotificationBell />
            <div className="relative" id="user-menu">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="h-9 w-9 rounded-full bg-charcoal-100 flex items-center justify-center text-charcoal-600 font-medium hover:bg-charcoal-200 transition-colors"
              >
                <User className="h-5 w-5" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      role="menuitem"
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

        {/* App Footer */}
        <footer className="grid grid-cols-3 items-center px-4 md:px-6 py-2 text-xs text-gray-500 bg-white border-t border-gray-200">
          <span></span> 
          <span className="text-center">
            {versionInfo ? (
              `v${versionInfo.version} — ${versionInfo.codename}`
            ) : (
              versionError || 'Loading version...'
            )}
          </span>
          <span className="text-right">
            © {new Date().getFullYear()} Pulse One
          </span>
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
}