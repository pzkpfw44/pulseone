// frontend/src/pages/EnhancedKnowledgeFeed.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, FileText, Image, FileSpreadsheet, X, CheckCircle,
  AlertCircle, Clock, Plus, Tag, FolderOpen, Brain, Sparkles,
  RefreshCw, Info, Lightbulb, ArrowRight, Settings, AlertTriangle,
  Zap, Target, TrendingUp, Database, Activity, BarChart3
} from 'lucide-react';
import api from '../services/api';

const EnhancedKnowledgeFeed = () => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLegacyData, setIsLegacyData] = useState(false);
  const [customTags, setCustomTags] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [recentUploads, setRecentUploads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});
  const [supportedTypes, setSupportedTypes] = useState({});
  const [uploadStats, setUploadStats] = useState({});
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const enhancedUploadTips = [
    {
      icon: Brain,
      title: "AI-Powered Processing",
      description: "Documents are automatically analyzed, categorized, and indexed for intelligent search and insights.",
      color: "bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 text-purple-800"
    },
    {
      icon: Target,
      title: "Smart Categorization", 
      description: "AI suggests and creates new categories based on document content to improve organization.",
      color: "bg-gradient-to-r from-charcoal-50 to-charcoal-100 border-charcoal-200 text-charcoal-800"
    },
    {
      icon: Sparkles,
      title: "Intelligent Content Extraction",
      description: "Advanced text extraction ignores decorative elements and focuses on meaningful content.",
      color: "bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-800"
    },
    {
      icon: Database,
      title: "Legacy Data Integration",
      description: "Mark historical data to preserve context while distinguishing from current information.",
      color: "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 text-orange-800"
    }
  ];

  // Rotate tips every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % enhancedUploadTips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadInitialData();
    loadRecentUploads();
    loadUploadStatistics();
    
    // Auto-refresh recent uploads every 10 seconds when uploading
    const interval = setInterval(() => {
      if (uploading || Object.keys(uploadProgress).length > 0) {
        loadRecentUploads();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [uploading, uploadProgress]);

  const loadInitialData = async () => {
    try {
      // Load supported file types
      const typesResponse = await api.get('/knowledge-feed/supported-types');
      setSupportedTypes(typesResponse.data);

      // Load categories
      const categoriesResponse = await api.get('/knowledge-feed/categories');
      setCategories(categoriesResponse.data.categories || []);
      setCategoryStats(categoriesResponse.data.statistics || {});

    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadRecentUploads = async () => {
    try {
      const response = await api.get('/knowledge-feed/recent?limit=10');
      setRecentUploads(response.data || []);
    } catch (error) {
      console.error('Error loading recent uploads:', error);
    }
  };

  const loadUploadStatistics = async () => {
    try {
      const response = await api.get('/knowledge-feed/statistics');
      setUploadStats(response.data || {});
    } catch (error) {
      console.error('Error loading upload statistics:', error);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      processNewFiles(newFiles);
    }
  }, [selectedCategory, customTags, isLegacyData]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files);
      processNewFiles(newFiles);
    }
  };

  const processNewFiles = (newFiles) => {
    const processedFiles = newFiles.map(file => {
      const warnings = validateFile(file);
      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        category: selectedCategory,
        tags: customTags.split(',').map(t => t.trim()).filter(t => t),
        isLegacy: isLegacyData,
        warnings: warnings,
        suggestedCategory: null
      };
    });

    setFiles(prev => [...prev, ...processedFiles]);
  };

  const validateFile = (file) => {
    const warnings = [];
    const maxSize = supportedTypes.maxSize || 100 * 1024 * 1024;
    const warningSize = supportedTypes.warningSize || 50 * 1024 * 1024;

    // Size validation
    if (file.size > maxSize) {
      warnings.push({
        type: 'error',
        message: `File exceeds maximum size of ${(maxSize / (1024 * 1024)).toFixed(0)}MB`,
        suggestion: 'Please compress the file or remove unnecessary media elements.'
      });
    } else if (file.size > warningSize) {
      warnings.push({
        type: 'warning',
        message: `Large file (${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
        suggestion: 'Consider optimizing for better processing performance.'
      });
    }

    // File type specific warnings
    if (file.name.toLowerCase().endsWith('.pptx') && file.size > 20 * 1024 * 1024) {
      warnings.push({
        type: 'info',
        message: 'PowerPoint file with high-resolution images detected',
        suggestion: 'Only text content will be extracted. Consider saving as PDF if layout is important.'
      });
    }

    return warnings;
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateFileCategory = (fileId, category) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, category } : f
    ));
  };

  const updateFileTags = (fileId, tags) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, tags: tags.split(',').map(t => t.trim()).filter(t => t) } : f
    ));
  };

  const updateFileLegacy = (fileId, isLegacy) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, isLegacy } : f
    ));
  };

  const handleUpload = async () => {
    if (files.length === 0 || uploading) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      
      // Add files
      files.forEach(fileData => {
        formData.append('files', fileData.file);
      });
      
      // Add metadata
      formData.append('category', selectedCategory);
      formData.append('tags', JSON.stringify(customTags.split(',').map(t => t.trim()).filter(t => t)));
      formData.append('isLegacy', isLegacyData);

      const response = await api.post('/knowledge-feed/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress({ overall: progress });
        }
      });

      if (response.data.success) {
        // Clear files and reset form
        setFiles([]);
        setUploadProgress({});
        
        // Refresh data
        loadRecentUploads();
        loadUploadStatistics();
        loadInitialData(); // Refresh categories in case new ones were created
        
        console.log('Upload successful:', response.data);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({ error: error.message });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'doc':
      case 'docx': return <FileText className="w-8 h-8 text-blue-500" />;
      case 'xls':
      case 'xlsx': return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png': return <Image className="w-8 h-8 text-purple-500" />;
      case 'ppt':
      case 'pptx': return <FileText className="w-8 h-8 text-orange-500" />;
      default: return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Clock className="w-4 h-4 text-charcoal-500 animate-pulse" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getProcessingStageText = (stage, method) => {
    switch (stage) {
      case 'uploaded': return 'Uploaded';
      case 'extracting_text': return 'Extracting content...';
      case 'categorizing': return method === 'ai-enhanced' ? 'AI categorizing...' : 'Pattern categorizing...';
      case 'generating_summary': return 'Generating summary...';
      case 'completed': return method === 'ai-enhanced' ? 'AI Processed' : 
                              method === 'pattern-based' ? 'Pattern Processed' :
                              method === 'pattern-verified' ? 'Pattern Verified' : 'Completed';
      case 'error': return 'Error occurred';
      default: return stage;
    }
  };

  const getMethodBadge = (method) => {
    if (!method || method === 'unknown') return null;
    
    const badges = {
      'ai-enhanced': { text: 'AI', color: 'bg-purple-100 text-purple-700' },
      'pattern-based': { text: 'Pattern', color: 'bg-blue-100 text-blue-700' },
      'pattern-verified': { text: 'Verified', color: 'bg-green-100 text-green-700' },
      'ai-new-category': { text: 'AI+New', color: 'bg-orange-100 text-orange-700' }
    };
    
    const badge = badges[method];
    if (!badge) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const currentTip = enhancedUploadTips[currentTipIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Feed</h1>
          <p className="text-gray-600">Upload and organize documents to build your AI-powered knowledge base</p>
        </div>
        <button 
          onClick={() => {
            loadRecentUploads();
            loadUploadStatistics();
            loadInitialData();
          }}
          className="inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Statistics Overview */}
      {uploadStats.documents && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color) 10%, white)' }}>
                <FileText className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-semibold text-gray-900">{uploadStats.documents.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processed</p>
                <p className="text-2xl font-semibold text-gray-900">{uploadStats.documents.processed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Storage Used</p>
                <p className="text-2xl font-semibold text-gray-900">{uploadStats.storage?.totalMB || '0'} MB</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Tag className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-semibold text-gray-900">{categoryStats.totalCategories || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Upload Tips */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">AI-Powered Knowledge Processing</h2>
            <div className="flex space-x-1">
              {enhancedUploadTips.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentTipIndex ? 'bg-charcoal-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className={`p-4 rounded-xl border-l-4 transition-all duration-500 ${currentTip.color}`}>
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <currentTip.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">{currentTip.title}</h3>
                <p className="text-sm opacity-90">{currentTip.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload New Documents</h2>
          
          {/* Global Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pulse-one-select"
              >
                <option value="">Let AI suggest category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name.replace('_', ' ')} {cat.aiSuggested ? '(AI)' : ''}
                    {cat.usageCount > 0 ? ` (${cat.usageCount})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Tags</label>
              <input
                type="text"
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="pulse-one-input"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={isLegacyData}
                  onChange={(e) => setIsLegacyData(e.target.checked)}
                  className="rounded border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                />
                <span className="ml-2 text-sm text-gray-700">Legacy Data</span>
              </label>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-charcoal-400' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            style={{
              backgroundColor: dragActive ? 'color-mix(in srgb, var(--primary-color) 5%, white)' : 'transparent'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              accept={supportedTypes.extensions?.join(',') || ".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.pptx"}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-500 mb-4">
              Supports PDF, Word, Excel, PowerPoint, images, and text files up to {supportedTypes.maxSize ? Math.floor(supportedTypes.maxSize / (1024 * 1024)) : 100}MB each
            </p>
            <button className="btn-brand-primary">
              <Plus className="w-4 h-4 mr-2" />
              Choose Files
            </button>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Files ({files.length})</h3>
              <div className="space-y-4">
                {files.map((fileData) => (
                  <div key={fileData.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getFileIcon(fileData.file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {fileData.file.name}
                          </h4>
                          <button
                            onClick={() => removeFile(fileData.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">
                          {formatFileSize(fileData.file.size)}
                        </p>
                        
                        {/* File warnings */}
                        {fileData.warnings && fileData.warnings.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {fileData.warnings.map((warning, index) => (
                              <div 
                                key={index} 
                                className={`p-2 rounded text-xs ${
                                  warning.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                                  warning.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                  'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                <div className="flex items-center">
                                  {warning.type === 'error' ? <AlertTriangle className="w-3 h-3 mr-1" /> :
                                   warning.type === 'warning' ? <AlertTriangle className="w-3 h-3 mr-1" /> :
                                   <Info className="w-3 h-3 mr-1" />}
                                  <span className="font-medium">{warning.message}</span>
                                </div>
                                {warning.suggestion && (
                                  <p className="mt-1 text-xs opacity-80">{warning.suggestion}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                            <select
                              value={fileData.category}
                              onChange={(e) => updateFileCategory(fileData.id, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-charcoal-500 focus:border-transparent"
                            >
                              <option value="">AI will suggest</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>
                                  {cat.name.replace('_', ' ')} {cat.aiSuggested ? '(AI)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
                            <input
                              type="text"
                              value={fileData.tags.join(', ')}
                              onChange={(e) => updateFileTags(fileData.id, e.target.value)}
                              placeholder="tag1, tag2"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-charcoal-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-center">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={fileData.isLegacy}
                                onChange={(e) => updateFileLegacy(fileData.id, e.target.checked)}
                                className="rounded border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                              />
                              <span className="ml-2 text-xs text-gray-700">Legacy Data</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Upload Progress */}
              {Object.keys(uploadProgress).length > 0 && (
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color) 5%, white)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--secondary-color)' }}>
                      {uploadProgress.error ? 'Upload Failed' : 
                       uploading ? 'Uploading...' : 'Processing...'}
                    </span>
                    {uploadProgress.overall && (
                      <span className="text-sm" style={{ color: 'var(--primary-color)' }}>{uploadProgress.overall}%</span>
                    )}
                  </div>
                  {uploadProgress.overall && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${uploadProgress.overall}%`,
                          backgroundColor: 'var(--primary-color)'
                        }}
                      ></div>
                    </div>
                  )}
                  {uploadProgress.error && (
                    <p className="text-sm text-red-600 mt-2">{uploadProgress.error}</p>
                  )}
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={uploading || files.length === 0 || files.some(f => f.warnings?.some(w => w.type === 'error'))}
                  className="btn-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload {files.length} File{files.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Uploads</h2>
          <p className="text-sm text-gray-500 mt-1">Track the processing status of your uploaded documents</p>
        </div>
        <div className="p-6">
          {recentUploads.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">No recent uploads</h3>
              <p className="text-sm text-gray-500">Upload documents to see them here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentUploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getFileIcon(upload.filename)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{upload.filename}</h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>Uploaded {new Date(upload.uploadedAt).toLocaleString()}</span>
                        {upload.wordCount > 0 && <span>{upload.wordCount.toLocaleString()} words</span>}
                        {upload.size && <span>{formatFileSize(upload.size)}</span>}
                      </div>
                      {upload.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-2">
                          {upload.category.replace('_', ' ')}
                          {upload.isLegacy && ' (Legacy)'}
                        </span>
                      )}
                      {upload.tags && upload.tags.length > 0 && (
                        <div className="mt-1">
                          {upload.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-block mr-1 px-1 py-0.5 text-xs rounded" 
                                  style={{ 
                                    backgroundColor: 'color-mix(in srgb, var(--primary-color) 10%, white)',
                                    color: 'var(--primary-color)'
                                  }}>
                              {tag}
                            </span>
                          ))}
                          {upload.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{upload.tags.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {getMethodBadge(upload.processingMethod)}
                        <div className="flex items-center">
                          {getStatusIcon(upload.status)}
                          <span className="ml-1 text-sm font-medium text-gray-900">
                            {getProcessingStageText(upload.processingStage || upload.status, upload.processingMethod)}
                          </span>
                        </div>
                      </div>
                      {upload.processingJob && upload.processingJob.progress > 0 && (
                        <div className="mt-1">
                          <div className="w-16 bg-gray-200 rounded-full h-1">
                            <div 
                              className="h-1 rounded-full transition-all duration-300" 
                              style={{ 
                                width: `${upload.processingJob.progress}%`,
                                backgroundColor: 'var(--primary-color)'
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {upload.errorMessage && (
                        <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={upload.errorMessage}>
                          {upload.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedKnowledgeFeed;