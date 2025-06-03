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
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
          <span className="text-lg text-gray-600">Loading branding settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Branding & Voice</h1>
        <p className="text-gray-600">Configure how your brand identity is reflected in AI-generated communications</p>
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
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 font-medium"
          >
            Save Changes
          </button>
        </div>
      )}

      {/* Company Identity Card */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
          <div className="p-2 bg-blue-100 rounded-lg">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">Company Identity</h2>
            <p className="text-sm text-gray-500">Basic information about your organization</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter company name"
              />
              <p className="text-xs text-gray-500 mt-1">This will appear in the sidebar and communications</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
              <select
                value={settings.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Retail">Retail</option>
                <option value="Other">Other</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Helps AI understand your business context</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Key Values & Principles</label>
            <textarea
              value={settings.keyValues}
              onChange={(e) => handleInputChange('keyValues', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your company's core values and principles (e.g., Innovation, Integrity, Customer Focus)"
            />
            <p className="text-xs text-gray-500 mt-1">These values will be reflected in AI-generated communications</p>
          </div>
        </div>
      </div>

      {/* FIXED: Brand Colors Card with proper layout */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Palette className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">Brand Colors</h2>
            <p className="text-sm text-gray-500">Define your visual identity across the platform</p>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          {/* TOP SECTION: Color Controls + Actions (side by side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* LEFT: Color Controls */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    className="w-12 h-10 p-1 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    onClick={() => copyColorToClipboard(settings.primaryColor)}
                    className="p-2 border border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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
                    className="w-12 h-10 p-1 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    onClick={() => copyColorToClipboard(settings.secondaryColor)}
                    className="p-2 border border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Secondary color for gradients and highlights</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleInputChange('primaryColor', '#4B5563');
                    handleInputChange('secondaryColor', '#374151');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Revert to Default Colors
                </button>
              </div>
            </div>

            {/* RIGHT: Action Buttons */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Actions</h3>
              <p className="text-sm text-gray-500 mb-6">Preview and save your changes</p>
              
              <div className="space-y-3">
                <button
                  onClick={handlePreview}
                  className={`w-full inline-flex items-center justify-center px-4 py-3 border rounded-lg transition-colors font-medium ${
                    previewMode 
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {previewMode ? 'Exit Preview' : 'Preview Changes'}
                </button>

                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors"
                >
                  <RotateCcw className={`w-4 h-4 mr-2 ${resetting ? 'animate-spin' : ''}`} />
                  Reset to Default
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-pulse' : ''}`} />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">How it works</h4>
                    <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                      Use Preview to test your changes temporarily. Save to apply them permanently across the platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Live Preview (horizontal layout) */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Live Preview</h3>
            <p className="text-sm text-gray-500 mb-6">See how your changes look across the platform</p>
            
            {/* HORIZONTAL: UI Elements | Sidebar Preview | Color Values */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* UI Elements */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-700 mb-4">UI ELEMENTS</h4>
                <div className="space-y-3">
                  <div 
                    className="p-3 rounded text-white text-center text-sm font-medium"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    Primary Button
                  </div>
                  
                  <div 
                    className="p-3 rounded border-2 text-center text-sm font-medium"
                    style={{ borderColor: settings.primaryColor, color: settings.primaryColor }}
                  >
                    Outlined Button
                  </div>
                  
                  <div 
                    className="p-3 rounded text-white text-center text-sm font-medium"
                    style={{ 
                      background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
                    }}
                  >
                    Gradient Background
                  </div>
                </div>
              </div>

              {/* Sidebar Preview */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-700 mb-4">SIDEBAR PREVIEW</h4>
                <div 
                  className="p-4 rounded shadow-sm"
                  style={{ 
                    background: `linear-gradient(to bottom, ${settings.primaryColor}, ${settings.secondaryColor})` 
                  }}
                >
                  <div className="flex items-center space-x-2 text-white mb-3">
                    <div 
                      className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ color: settings.primaryColor }}
                    >
                      P1
                    </div>
                    <span className="font-medium text-sm">{settings.companyName?.split(' ')[0] || 'Pulse'}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-white/90 text-xs p-1.5 bg-white/20 rounded">Dashboard</div>
                    <div className="text-white/70 text-xs p-1.5 hover:bg-white/10 rounded">Knowledge Feed</div>
                    <div className="text-white/70 text-xs p-1.5 hover:bg-white/10 rounded">Analytics</div>
                    <div className="text-white/70 text-xs p-1.5 hover:bg-white/10 rounded">Settings</div>
                  </div>
                </div>
              </div>

              {/* Color Values */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-700 mb-4">COLOR VALUES</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded border text-sm">
                    <span className="font-medium text-gray-700">Primary:</span>
                    <span className="font-mono text-gray-600 text-xs">{settings.primaryColor}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded border text-sm">
                    <span className="font-medium text-gray-700">Secondary:</span>
                    <span className="font-mono text-gray-600 text-xs">{settings.secondaryColor}</span>
                  </div>
                  
                  {/* Color swatches */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div 
                        className="h-8 rounded border"
                        style={{ backgroundColor: settings.primaryColor }}
                        title="Primary Color"
                      ></div>
                      <div 
                        className="h-8 rounded border"
                        style={{ backgroundColor: settings.secondaryColor }}
                        title="Secondary Color"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Style Card */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
          <div className="p-2 bg-green-100 rounded-lg">
            <Type className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">Communication Style</h2>
            <p className="text-sm text-gray-500">How AI should communicate on behalf of your company</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
              <select
                value={settings.communicationTone}
                onChange={(e) => handleInputChange('communicationTone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Overall tone of communications</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Formality Level</label>
              <select
                value={settings.formalityLevel}
                onChange={(e) => handleInputChange('formalityLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="very_formal">Very Formal</option>
                <option value="formal">Formal</option>
                <option value="neutral">Neutral</option>
                <option value="informal">Informal</option>
                <option value="very_informal">Very Informal</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Level of formality</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Personality</label>
              <select
                value={settings.personality}
                onChange={(e) => handleInputChange('personality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="helpful">Helpful</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="direct">Direct</option>
                <option value="empathetic">Empathetic</option>
                <option value="authoritative">Authoritative</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">AI personality traits</p>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-medium text-blue-900">Preview: How AI Will Sound</h4>
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">
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
    </div>
  );
};

export default BrandingSettings;