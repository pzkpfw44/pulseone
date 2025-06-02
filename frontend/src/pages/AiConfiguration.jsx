// frontend/src/pages/AiConfiguration.jsx

import React, { useState, useEffect } from 'react';
import { 
  Brain, Settings, Save, AlertTriangle, CheckCircle, 
  RefreshCw, Zap, Shield, Cpu, Database, Eye, EyeOff
} from 'lucide-react';
import { settingsApi } from '../services/api';

const AiConfiguration = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [configuration, setConfiguration] = useState({
    fluxApiKey: '',
    model: 'DeepSeek R1 Distill Qwen 32B',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    enableSafetyFilters: true,
    enableBiasDetection: true,
    enableContentModeration: true,
    responseTimeout: 30,
    maxRetries: 3,
    enableCaching: true,
    cacheTimeout: 3600,
    enableAnalytics: true,
    logLevel: 'info'
  });

  const [availableModels, setAvailableModels] = useState([]);
  const [aiBalance, setAiBalance] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  useEffect(() => {
    loadConfiguration();
    loadAvailableModels();
    loadAiBalance();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await settingsApi.getAiConfiguration();
      setConfiguration(prev => ({ ...prev, ...response.data }));
      setError(null);
    } catch (err) {
      console.error('[PULSE-ONE] Error loading AI configuration:', err);
      setError('Failed to load AI configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      // Mock data for now
      setAvailableModels([
        { id: 'DeepSeek R1 Distill Qwen 32B', name: 'DeepSeek R1 Distill Qwen 32B', description: 'Latest distilled model with enhanced reasoning' },
        { id: 'Llama 3.1 70B', name: 'Llama 3.1 70B', description: 'Meta\'s large language model' },
        { id: 'Claude 3.5 Sonnet', name: 'Claude 3.5 Sonnet', description: 'Anthropic\'s balanced model' },
        { id: 'GPT-4 Turbo', name: 'GPT-4 Turbo', description: 'OpenAI\'s fastest GPT-4 variant' }
      ]);
    } catch (err) {
      console.error('[PULSE-ONE] Error loading models:', err);
    }
  };

  const loadAiBalance = async () => {
    try {
      // Mock data for now
      setAiBalance({
        credits: -0.6,
        currency: 'USD',
        lastUpdated: new Date()
      });
    } catch (err) {
      console.error('[PULSE-ONE] Error loading AI balance:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfiguration(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSliderChange = (name, value) => {
    setConfiguration(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('testing');
    
    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConnectionStatus('success');
      
      setTimeout(() => {
        setConnectionStatus('unknown');
      }, 3000);
    } catch (err) {
      setConnectionStatus('error');
      setTimeout(() => {
        setConnectionStatus('unknown');
      }, 3000);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await settingsApi.updateAiConfiguration(configuration);
      setSuccess(true);
      setError(null);
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('[PULSE-ONE] Error saving AI configuration:', err);
      setError('Failed to save AI configuration. Please try again.');
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Zap className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-charcoal-200 border-t-charcoal-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-charcoal-600">Loading AI configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Configuration</h1>
          <p className="text-gray-600">Configure Flux AI models, behavior settings, and performance parameters</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={testConnection}
            disabled={testingConnection}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {getConnectionStatusIcon()}
            <span className="ml-2">Test Connection</span>
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-charcoal-600 text-white rounded-lg hover:bg-charcoal-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
          <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
          <p className="text-sm">AI configuration saved successfully</p>
        </div>
      )}

      {/* AI Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">AI Model</p>
              <p className="text-lg font-semibold text-gray-900">{configuration.model}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Cpu className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-lg font-semibold text-green-600">Connected</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">API Balance</p>
              <p className="text-lg font-semibold text-gray-900">
                {aiBalance ? `$${Math.abs(aiBalance.credits).toFixed(2)}` : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* API Configuration */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">API Configuration</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Configure your Flux AI API connection and authentication
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <label htmlFor="fluxApiKey" className="block text-sm font-medium text-gray-700">
                  Flux AI API Key
                </label>
                <div className="mt-1 relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    name="fluxApiKey"
                    id="fluxApiKey"
                    value={configuration.fluxApiKey}
                    onChange={handleInputChange}
                    placeholder="Enter your Flux AI API key"
                    className="pulse-one-input pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your API key is stored securely and encrypted at rest
                </p>
              </div>

              <div className="col-span-6">
                <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                  AI Model
                </label>
                <select
                  id="model"
                  name="model"
                  value={configuration.model}
                  onChange={handleInputChange}
                  className="pulse-one-select mt-1"
                >
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Model Parameters */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Model Parameters</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Fine-tune AI behavior and response characteristics
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
                  Temperature: {configuration.temperature}
                </label>
                <input
                  type="range"
                  id="temperature"
                  name="temperature"
                  min="0"
                  max="2"
                  step="0.1"
                  value={configuration.temperature}
                  onChange={(e) => handleSliderChange('temperature', parseFloat(e.target.value))}
                  className="mt-1 w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Controls randomness (0 = deterministic, 2 = very creative)
                </p>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700">
                  Max Tokens
                </label>
                <input
                  type="number"
                  name="maxTokens"
                  id="maxTokens"
                  min="100"
                  max="8000"
                  value={configuration.maxTokens}
                  onChange={handleInputChange}
                  className="pulse-one-input mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum length of AI responses
                </p>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="topP" className="block text-sm font-medium text-gray-700">
                  Top P: {configuration.topP}
                </label>
                <input
                  type="range"
                  id="topP"
                  name="topP"
                  min="0"
                  max="1"
                  step="0.1"
                  value={configuration.topP}
                  onChange={(e) => handleSliderChange('topP', parseFloat(e.target.value))}
                  className="mt-1 w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Nucleus sampling parameter
                </p>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="responseTimeout" className="block text-sm font-medium text-gray-700">
                  Response Timeout (seconds)
                </label>
                <input
                  type="number"
                  name="responseTimeout"
                  id="responseTimeout"
                  min="5"
                  max="120"
                  value={configuration.responseTimeout}
                  onChange={handleInputChange}
                  className="pulse-one-input mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Safety and Compliance */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Safety & Compliance</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Configure content moderation and safety features
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="enableSafetyFilters"
                  name="enableSafetyFilters"
                  type="checkbox"
                  checked={configuration.enableSafetyFilters}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-charcoal-600 focus:ring-charcoal-500 border-gray-300 rounded"
                />
                <label htmlFor="enableSafetyFilters" className="ml-2 block text-sm text-gray-900">
                  Enable safety filters
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="enableBiasDetection"
                  name="enableBiasDetection"
                  type="checkbox"
                  checked={configuration.enableBiasDetection}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-charcoal-600 focus:ring-charcoal-500 border-gray-300 rounded"
                />
                <label htmlFor="enableBiasDetection" className="ml-2 block text-sm text-gray-900">
                  Enable bias detection
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="enableContentModeration"
                  name="enableContentModeration"
                  type="checkbox"
                  checked={configuration.enableContentModeration}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-charcoal-600 focus:ring-charcoal-500 border-gray-300 rounded"
                />
                <label htmlFor="enableContentModeration" className="ml-2 block text-sm text-gray-900">
                  Enable content moderation
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="enableAnalytics"
                  name="enableAnalytics"
                  type="checkbox"
                  checked={configuration.enableAnalytics}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-charcoal-600 focus:ring-charcoal-500 border-gray-300 rounded"
                />
                <label htmlFor="enableAnalytics" className="ml-2 block text-sm text-gray-900">
                  Enable usage analytics
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Performance Settings</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Optimize performance and caching behavior
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="maxRetries" className="block text-sm font-medium text-gray-700">
                  Max Retries
                </label>
                <input
                  type="number"
                  name="maxRetries"
                  id="maxRetries"
                  min="0"
                  max="5"
                  value={configuration.maxRetries}
                  onChange={handleInputChange}
                  className="pulse-one-input mt-1"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="cacheTimeout" className="block text-sm font-medium text-gray-700">
                  Cache Timeout (seconds)
                </label>
                <input
                  type="number"
                  name="cacheTimeout"
                  id="cacheTimeout"
                  min="60"
                  max="86400"
                  value={configuration.cacheTimeout}
                  onChange={handleInputChange}
                  className="pulse-one-input mt-1"
                />
              </div>

              <div className="col-span-6">
                <div className="flex items-center">
                  <input
                    id="enableCaching"
                    name="enableCaching"
                    type="checkbox"
                    checked={configuration.enableCaching}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-charcoal-600 focus:ring-charcoal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableCaching" className="ml-2 block text-sm text-gray-900">
                    Enable response caching for improved performance
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="pulse-one-button-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AiConfiguration;