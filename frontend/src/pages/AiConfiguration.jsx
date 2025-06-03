// frontend/src/pages/AiConfiguration.jsx - Fixed Test Connection Logic

import React, { useState, useEffect } from 'react';
import {
  Save, Database, Check, AlertTriangle, RefreshCw, Eye, EyeOff,
  Zap, Trash2, TestTube, Brain, Shield, Activity, Settings,
  TrendingUp, FileText, Tag, Target
} from 'lucide-react';
import api from '../services/api';

const AiConfiguration = () => {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testing, setTesting] = useState(false);
  
  // AI Configuration State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [enableSafetyFilters, setEnableSafetyFilters] = useState(true);
  const [enableBiasDetection, setEnableBiasDetection] = useState(true);
  const [enableContentModeration, setEnableContentModeration] = useState(true);
  
  // External Data State
  const [availableModels, setAvailableModels] = useState([]);
  const [apiCredit, setApiCredit] = useState(null);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [lastEnteredKey, setLastEnteredKey] = useState('');
  
  // NEW: Track if we have a valid API key stored
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  
  // Storage Management State
  const [storageInfo, setStorageInfo] = useState(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [deletingFile, setDeletingFile] = useState(null);
  const [cleaningUpFiles, setCleaningUpFiles] = useState(false);
  const [storageUsagePercent, setStorageUsagePercent] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch AI configuration
      const configResponse = await api.get('/ai-configuration');
      if (configResponse.data) {
        const config = configResponse.data;
        setApiKey(config.fluxApiKey || '');
        setSelectedModel(config.model || 'DeepSeek R1 Distill Qwen 32B');
        setTemperature(config.temperature || 0.7);
        setMaxTokens(config.maxTokens || 2000);
        setEnableSafetyFilters(config.enableSafetyFilters !== false);
        setEnableBiasDetection(config.enableBiasDetection !== false);
        setEnableContentModeration(config.enableContentModeration !== false);
        
        // NEW: Track if we have a stored API key
        setHasStoredApiKey(!!(config.fluxApiKey && config.fluxApiKey !== ''));
      }

      // Fetch available models
      await fetchAvailableModels();
      
      // Fetch account balance and storage info
      await fetchApiBalance();
      await handleRefreshStorage();
      
      setError(null);
    } catch (err) {
      console.error('Error fetching AI configuration:', err);
      setError('Failed to load AI configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const modelsResponse = await api.get('/ai-configuration/models');
      if (modelsResponse.data && modelsResponse.data.data) {
        setAvailableModels(modelsResponse.data.data);
      }
    } catch (modelError) {
      console.warn('Could not fetch models, using default list:', modelError);
      setAvailableModels([
        { nickname: "DeepSeek R1 Distill Qwen 32B", model_name: "DeepSeek R1 Distill Qwen 32B" },
        { nickname: "Llama 3.1", model_name: "Llama 3.1" },
        { nickname: "Mistral", model_name: "Mistral" }
      ]);
    }
  };

  const fetchApiBalance = async () => {
    setRefreshingBalance(true);
    try {
      const balanceResponse = await api.get('/ai-configuration/balance');
      setApiCredit(balanceResponse.data?.api_credit ?? null);
    } catch (err) {
      console.warn('Could not fetch API balance:', err);
      setApiCredit(null);
    } finally {
      setRefreshingBalance(false);
    }
  };

  const handleRefreshStorage = async () => {
    setLoadingStorage(true);
    try {
      const response = await api.get('/ai-configuration/storage');
      setStorageInfo(response.data);
      
      if (response.data && response.data.totalStorage) {
        const percent = Math.round((response.data.usedStorage / response.data.totalStorage) * 100);
        setStorageUsagePercent(percent);
      }
    } catch (err) {
      console.error('Error fetching storage info:', err);
      setError('Failed to load storage information');
    } finally {
      setLoadingStorage(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    setDeletingFile(fileId);
    try {
      await api.delete(`/ai-configuration/files/${fileId}`);
      await handleRefreshStorage();
      setSuccess('File deleted successfully');
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleCleanupAllFiles = async () => {
    if (!window.confirm('Are you sure you want to delete all files from Flux AI storage? This cannot be undone.')) {
      return;
    }
    
    setCleaningUpFiles(true);
    try {
      await api.post('/ai-configuration/cleanup');
      await handleRefreshStorage();
      setSuccess('All files have been deleted');
    } catch (err) {
      console.error('Error cleaning up files:', err);
      setError('Failed to clean up files');
    } finally {
      setCleaningUpFiles(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    setSuccess(null);
    setError(null);
    
    try {
      const data = {
        fluxApiKey: apiKey === '••••••••' ? undefined : apiKey,
        model: selectedModel,
        temperature: temperature,
        maxTokens: maxTokens,
        enableSafetyFilters: enableSafetyFilters,
        enableBiasDetection: enableBiasDetection,
        enableContentModeration: enableContentModeration
      };

      const response = await api.put('/ai-configuration', data);
      if (response.data.success) {
        setSuccess('AI configuration saved successfully');
        if (apiKey !== '••••••••') {
          setLastEnteredKey(apiKey);
          setApiKey('••••••••');
          setHasStoredApiKey(true); // NEW: Mark that we have a stored key
        }
      }
    } catch (err) {
      console.error('Error saving AI configuration:', err);
      setError(`Failed to save configuration. ${err.response?.data?.error || 'Please try again.'}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await api.post('/ai-configuration/test');
      if (response.data.success) {
        setSuccess('AI connection test successful! Configuration is working properly.');
      } else {
        setError(`Connection test failed: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setError('Connection test failed. Please check your API key and try again.');
    } finally {
      setTesting(false);
    }
  };

  const handleApiKeyChange = (e) => {
    const newValue = e.target.value;
    setApiKey(newValue);
    if (newValue !== '••••••••') {
      setLastEnteredKey(newValue);
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
    setLastEnteredKey('');
    setHasStoredApiKey(false); // NEW: Clear the stored key flag
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // NEW: Check if we can test the connection
  const canTestConnection = () => {
    return hasStoredApiKey || (apiKey && apiKey !== '' && apiKey !== '••••••••');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">Loading AI configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Configuration</h1>
        <p className="text-gray-600">Configure Flux AI models, behavior settings, and performance parameters</p>
      </div>

      {/* Alert Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center">
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Configuration Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-500" />
            Flux AI Configuration
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure connection and analysis settings for intelligent document processing.
          </p>
        </div>

        <div className="p-6 space-y-8">
          
          {/* API Connection Section */}
          <section>
            <h3 className="text-md font-semibold mb-4 text-gray-800 flex items-center">
              <Database className="h-4 w-4 mr-2" />
              API Connection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* API Key Input */}
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  Flux AI API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    id="apiKey"
                    value={apiKey === '••••••••' && showApiKey && lastEnteredKey ? lastEnteredKey : apiKey}
                    onChange={handleApiKeyChange}
                    className="block w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your Flux AI API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                  >
                    {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Keep this secure. Get your API key from{' '}
                  <a href="https://runonflux.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                    runonflux.com
                  </a>
                </p>
                {apiKey && (
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="inline-flex items-center text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Key
                    </button>
                  </div>
                )}
              </div>

              {/* AI Model Selector */}
              <div>
                <label htmlFor="aiModel" className="block text-sm font-medium text-gray-700 mb-1">
                  AI Model
                </label>
                <select
                  id="aiModel"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select AI model</option>
                  {availableModels.map((model) => (
                    <option key={model.model_name} value={model.model_name}>
                      {model.nickname} ({model.model_name})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choose the AI model for document categorization and analysis.
                </p>
              </div>
            </div>

            {/* Test Connection - FIXED */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleTestConnection}
                disabled={testing || !canTestConnection()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </button>
              {hasStoredApiKey && (
                <p className="text-xs text-gray-500 mt-2">
                  API key is configured and ready for testing
                </p>
              )}
            </div>
          </section>

          {/* AI Behavior Settings */}
          <section>
            <h3 className="text-md font-semibold mb-4 text-gray-800 flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              AI Behavior Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Temperature */}
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  id="temperature"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Conservative (0)</span>
                  <span>Creative (1)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens Per Request
                </label>
                <input
                  type="number"
                  id="maxTokens"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
                  min="500"
                  max="8000"
                  step="100"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Higher values allow processing longer documents but increase costs.
                </p>
              </div>
            </div>

            {/* Safety Features */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Safety & Content Controls
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableSafetyFilters"
                    checked={enableSafetyFilters}
                    onChange={(e) => setEnableSafetyFilters(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableSafetyFilters" className="ml-2 block text-sm text-gray-700">
                    Safety Filters
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableBiasDetection"
                    checked={enableBiasDetection}
                    onChange={(e) => setEnableBiasDetection(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableBiasDetection" className="ml-2 block text-sm text-gray-700">
                    Bias Detection
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableContentModeration"
                    checked={enableContentModeration}
                    onChange={(e) => setEnableContentModeration(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableContentModeration" className="ml-2 block text-sm text-gray-700">
                    Content Moderation
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Account Status */}
          <section>
            <h3 className="text-md font-semibold mb-4 text-gray-800 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Account Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* API Credits */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">API Credits</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {apiCredit !== null ? apiCredit : '--'}
                    </p>
                  </div>
                  <button
                    onClick={fetchApiBalance}
                    disabled={refreshingBalance}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingBalance ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Storage Usage */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Storage Usage</p>
                  <button
                    onClick={handleRefreshStorage}
                    disabled={loadingStorage}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingStorage ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      storageUsagePercent > 90 ? 'bg-red-500' : 
                      storageUsagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${storageUsagePercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {storageInfo ? (
                    `${formatBytes(storageInfo.usedStorage)} / ${formatBytes(storageInfo.totalStorage)}`
                  ) : (
                    'Loading...'
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* Why Flux AI Section */}
          <section className="pt-6 border-t border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <Zap className="h-6 w-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Powered by Flux AI
                  </h3>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    Pulse One leverages Flux AI's decentralized infrastructure for lightning-fast, private, and resilient 
                    document processing. Built on a fully distributed network with no single point of failure, 
                    ensuring your data remains secure while delivering enterprise-grade AI capabilities.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-blue-700">
                    <span className="flex items-center">
                      <Shield className="h-3 w-3 mr-1" />
                      Privacy by Design
                    </span>
                    <span className="flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      High Performance
                    </span>
                    <span className="flex items-center">
                      <Database className="h-3 w-3 mr-1" />
                      Decentralized
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saveLoading}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiConfiguration;