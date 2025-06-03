import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('admin@pulseone.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { user, login, error } = useAuth();
  const [brandingSettings, setBrandingSettings] = useState(null);

  // Load branding settings for login page
  useEffect(() => {
    const loadBrandingSettings = async () => {
      try {
        const cached = localStorage.getItem('brandingSettings');
        if (cached) {
          const parsed = JSON.parse(cached);
          setBrandingSettings(parsed);
          applyBrandingColors(parsed);
        }

        const response = await api.get('/settings/branding');
        if (response.data?.success) {
          setBrandingSettings(response.data.data);
          applyBrandingColors(response.data.data);
          localStorage.setItem('brandingSettings', JSON.stringify(response.data.data));
        }
      } catch (error) {
        console.error('Error loading branding settings for login:', error);
        // Apply default charcoal colors
        applyBrandingColors({
          primaryColor: '#4B5563',
          secondaryColor: '#374151'
        });
      }
    };

    loadBrandingSettings();
  }, []);

  const applyBrandingColors = (settings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.primaryColor || '#4B5563');
    root.style.setProperty('--secondary-color', settings.secondaryColor || '#374151');
    root.style.setProperty('--brand-primary', settings.primaryColor || '#4B5563');
    root.style.setProperty('--brand-secondary', settings.secondaryColor || '#374151');
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  const companyName = brandingSettings?.companyName || 'Pulse One';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div 
            className="mx-auto h-12 w-12 flex items-center justify-center rounded-full text-white shadow-lg"
            style={{
              background: brandingSettings?.enableGradients 
                ? `linear-gradient(to right, var(--primary-color), var(--secondary-color))`
                : 'var(--primary-color)'
            }}
          >
            <span className="text-xl font-bold">P1</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to {companyName}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            AI-powered orchestration platform
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:border-transparent transition-colors"
                style={{
                  '--tw-ring-color': 'var(--primary-color)'
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:border-transparent transition-colors"
                style={{
                  '--tw-ring-color': 'var(--primary-color)'
                }}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 focus:ring-2 transition-colors"
                style={{
                  '--tw-ring-color': 'var(--primary-color)',
                  color: 'var(--primary-color)'
                }}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a 
                href="#" 
                className="font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--primary-color)' }}
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: 'var(--primary-color)',
              '--tw-ring-color': 'var(--primary-color)'
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Don't have an account?{' '}
            <a 
              href="#" 
              className="font-medium hover:opacity-80 transition-opacity"
              style={{ color: 'var(--primary-color)' }}
            >
              Contact your administrator
            </a>
          </p>
        </div>

        {/* Demo credentials note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials</h4>
          <p className="text-sm text-blue-800">
            <strong>Email:</strong> admin@pulseone.com<br />
            <strong>Password:</strong> admin123
          </p>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} {companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;