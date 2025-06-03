import React, { useState, useEffect } from 'react';
import { 
  Palette, Save, RotateCcw, Eye, Copy, CheckCircle, AlertTriangle,
  RefreshCw, Info, Zap, Type, Image as ImageIcon, Settings as SettingsIcon
} from 'lucide-react';
import api from '../../services/api';

const BrandingSettings = () => {
  const [settings, setSettings] = useState({
    companyName: 'Pulse One',
    industry: 'Technology',
    keyValues: 'Innovation, Integrity, Excellence',
    primaryColor: '#4B5563',
    secondaryColor: '#374151',
    accentColor: '#6B7280',
    backgroundColor: '#F9FAFB',
    communicationTone: 'professional',
    formalityLevel: 'formal',
    personality: 'helpful',
    logoUrl: '',
    faviconUrl: '',
    fontFamily: 'Inter',
    brandGradientDirection: 'to-right',
    enableGradients: true,
    customCSS: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [previewMode, setPreviewMode] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadBrandingSettings();
  }, []);

  const loadBrandingSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/branding');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
      showMessage('error', 'Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put('/settings/branding', settings);
      
      if (response.data.success) {
        setSettings(response.data.data);
        showMessage('success', 'Branding settings saved successfully');
        
        // Apply the new branding immediately
        applyBrandingColors(response.data.data);
        
        // Update localStorage cache
        localStorage.setItem('brandingSettings', JSON.stringify(response.data.data));
      }
    } catch (error) {
      console.error('Error saving branding settings:', error);
      showMessage('error', error.response?.data?.error || 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all branding settings to default? This action cannot be undone.')) {
      return;
    }

    try {
      setResetting(true);
      const response = await api.post('/settings/branding/reset');
      
      if (response.data.success) {
        setSettings(response.data.data);
        showMessage('success', 'Branding settings reset to default');
        
        // Apply the default branding immediately
        applyBrandingColors(response.data.data);
        
        // Update localStorage cache
        localStorage.setItem('brandingSettings', JSON.stringify(response.data.data));
      }
    } catch (error) {
      console.error('Error resetting branding settings:', error);
      showMessage('error', 'Failed to reset branding settings');
    } finally {
      setResetting(false);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await api.post('/settings/branding/preview', settings);
      if (response.data.success) {
        if (previewMode) {
          // Restore original settings
          const originalSettings = JSON.parse(localStorage.getItem('brandingSettings') || '{}');
          applyBrandingColors(originalSettings);
          setPreviewMode(false);
          showMessage('info', 'Preview mode disabled');
        } else {
          // Apply preview settings
          applyBrandingColors(settings);
          setPreviewMode(true);
          showMessage('info', 'Preview mode enabled. Save to make changes permanent.');
        }
      }
    } catch (error) {
      console.error('Error toggling preview:', error);
      showMessage('error', 'Failed to toggle preview');
    }
  };

  const applyBrandingColors = (brandingSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', brandingSettings.primaryColor);
    root.style.setProperty('--secondary-color', brandingSettings.secondaryColor);
    root.style.setProperty('--accent-color', brandingSettings.accentColor);
    root.style.setProperty('--background-color', brandingSettings.backgroundColor);
    root.style.setProperty('--brand-primary', brandingSettings.primaryColor);
    root.style.setProperty('--brand-secondary', brandingSettings.secondaryColor);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const copyColorToClipboard = (color) => {
    navigator.clipboard.writeText(color);
    showMessage('success', `Color ${color} copied to clipboard`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-charcoal-500" />
          <span className="text-charcoal-600">Loading branding settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Company Branding & Voice</h2>
          <p className="text-gray-600">Configure how your brand identity is reflected in AI-generated communications</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePreview}
            className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors ${
              previewMode 
                ? 'bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Exit Preview' : 'Preview'}
          </button>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 mr-2 ${resetting ? 'animate-spin' : ''}`} />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {message.text && (
        <div className={`p-4 rounded-lg border flex items-center ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> :
           message.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-2" /> :
           <Info className="w-5 h-5 mr-2" />}
          {message.text}
        </div>
      )}

      {/* Preview Mode Banner */}
      {previewMode && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            <span className="font-medium">Preview Mode Active</span>
            <span className="ml-2 text-sm">Changes are temporary until saved</span>
          </div>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Save Changes
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Company Identity */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <SettingsIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Company Identity</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                <select
                  value={settings.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 focus:border-transparent"
                >
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Key Values & Principles</label>
              <textarea
                value={settings.keyValues}
                onChange={(e) => handleInputChange('keyValues', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 focus:border-transparent"
                placeholder="Describe your company's core values and principles (e.g., Innovation, Integrity, Customer Focus)"
              />
            </div>
          </div>

          {/* Company Colors */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Company Colors</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 focus:border-transparent font-mono"
                  />
                  <button
                    onClick={() => copyColorToClipboard(settings.primaryColor)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Main color for headers, buttons and accents</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 focus:border-transparent font-mono"
                  />
                  <button
                    onClick={() => copyColorToClipboard(settings.secondaryColor)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Secondary color for gradients and highlights</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => {
                  handleInputChange('primaryColor', '#4B5563');
                  handleInputChange('secondaryColor', '#374151');
                }}
                className="text-sm text-charcoal-600 hover:text-charcoal-800 flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Revert to Default Colors
              </button>
            </div>
          </div>

          {/* Communication Style */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Type className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Communication Style</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                <select
                  value={settings.communicationTone}
                  onChange={(e) => handleInputChange('communicationTone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 focus:border-transparent"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Formality Level</label>
                <select
                  value={settings.formalityLevel}
                  onChange={(e) => handleInputChange('formalityLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 focus:border-transparent"
                >
                  <option value="very_formal">Very Formal</option>
                  <option value="formal">Formal</option>
                  <option value="neutral">Neutral</option>
                  <option value="informal">Informal</option>
                  <option value="very_informal">Very Informal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Personality</label>
                <select
                  value={settings.personality}
                  onChange={(e) => handleInputChange('personality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 focus:border-transparent"
                >
                  <option value="helpful">Helpful</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="direct">Direct</option>
                  <option value="empathetic">Empathetic</option>
                  <option value="authoritative">Authoritative</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-900">Preview: How AI Will Sound</h4>
              </div>
              <p className="text-sm text-blue-800">
                {settings.communicationTone === 'professional' && settings.formalityLevel === 'formal' && settings.personality === 'helpful' 
                  ? "We value your input and appreciate your participation. We are here to assist if you have any questions. We're here to support you throughout this process."
                  : settings.communicationTone === 'friendly' && settings.personality === 'enthusiastic'
                  ? "We'd love to hear your thoughts! Thanks for being part of this journey. Feel free to reach out anytime – we're excited to help!"
                  : "Your communication style will be reflected in all AI-generated content based on your selected preferences."
                }
              </p>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Color Preview</h3>
            
            {/* UI Elements Preview */}
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: settings.primaryColor }}>
                <span className="text-white font-medium">Primary Button</span>
              </div>
              
              <div className="p-4 rounded-lg border-2" style={{ borderColor: settings.primaryColor, color: settings.primaryColor }}>
                <span className="font-medium">Text with primary color</span>
              </div>
              
              <div 
                className="p-4 rounded-lg text-white" 
                style={{ 
                  background: `linear-gradient(${settings.brandGradientDirection}, ${settings.primaryColor}, ${settings.secondaryColor})` 
                }}
              >
                <span className="font-medium">Gradient Background</span>
              </div>
            </div>

            {/* Sidebar Preview */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Sidebar Preview</h4>
              <div 
                className="p-4 rounded-lg"
                style={{ 
                  background: `linear-gradient(to bottom, ${settings.primaryColor}, ${settings.secondaryColor})` 
                }}
              >
                <div className="flex items-center space-x-2 text-white mb-3">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold"
                       style={{ color: settings.primaryColor }}>
                    P1
                  </div>
                  <span className="font-semibold">Pulse One</span>
                </div>
                <div className="space-y-1">
                  <div className="text-white/80 text-sm">Dashboard</div>
                  <div className="text-white/60 text-sm">Knowledge Feed</div>
                  <div className="text-white/60 text-sm">Analytics</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;