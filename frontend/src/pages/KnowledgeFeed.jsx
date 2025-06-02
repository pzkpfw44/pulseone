import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, FileText, Image, FileSpreadsheet, X, CheckCircle,
  AlertCircle, Clock, Plus, Tag, FolderOpen, Brain, Sparkles,
  RefreshCw, Info, Lightbulb, ArrowRight, Settings
} from 'lucide-react';
import api from '../services/api';

const KnowledgeFeed = () => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLegacyData, setIsLegacyData] = useState(false);
  const [customTags, setCustomTags] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [recentUploads, setRecentUploads] = useState([]);

  const documentCategories = [
    { value: '', label: 'Select Category', aiSuggested: false },
    { value: 'policies_procedures', label: 'Policies & Procedures', aiSuggested: false },
    { value: 'job_frameworks', label: 'Job Frameworks', aiSuggested: false },
    { value: 'training_materials', label: 'Training Materials', aiSuggested: false },
    { value: 'compliance_documents', label: 'Compliance Documents', aiSuggested: false },
    { value: 'legacy_assessment_data', label: 'Legacy Assessment Data', aiSuggested: false },
    { value: 'legacy_survey_data', label: 'Legacy Survey Data', aiSuggested: false },
    { value: 'organizational_guidelines', label: 'Organizational Guidelines', aiSuggested: false },
    // AI will suggest additional categories dynamically
  ];

  const [categories, setCategories] = useState(documentCategories);

  useEffect(() => {
    loadRecentUploads();
  }, []);

  const loadRecentUploads = async () => {
    try {
      const response = await api.get('/knowledge-feed/recent');
      setRecentUploads(response.data || []);
    } catch (error) {
      console.error('Error loading recent uploads:', error);
      // Mock data for development
      setRecentUploads([
        {
          id: 1,
          filename: 'HR_Policy_Update_2024.pdf',
          category: 'policies_procedures',
          status: 'processing',
          uploadedAt: new Date('2024-12-15T10:30:00'),
          processingStage: 'extracting_text'
        },
        {
          id: 2,
          filename: 'Leadership_Framework.docx',
          category: 'job_frameworks',
          status: 'completed',
          uploadedAt: new Date('2024-12-14T16:45:00'),
          processingStage: 'completed'
        }
      ]);
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
      setFiles(prev => [...prev, ...newFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        category: '',
        tags: [],
        isLegacy: false
      }))]);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        category: selectedCategory,
        tags: customTags.split(',').map(t => t.trim()).filter(t => t),
        isLegacy: isLegacyData
      }))]);
    }
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
    if (files.length === 0) return;

    setUploading(true);
    
    for (const fileData of files) {
      try {
        const formData = new FormData();
        formData.append('files', fileData.file);
        formData.append('category', fileData.category);
        formData.append('tags', JSON.stringify(fileData.tags));
        formData.append('isLegacy', fileData.isLegacy);

        // Start upload with progress tracking
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: { status: 'uploading', progress: 0 }
        }));

        const response = await api.post('/knowledge-feed/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({
              ...prev,
              [fileData.id]: { status: 'uploading', progress }
            }));
          }
        });

        // Upload completed, now processing
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: { status: 'processing', progress: 100 }
        }));

        // Simulate processing stages
        setTimeout(() => {
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: { status: 'completed', progress: 100 }
          }));
        }, 2000);

      } catch (error) {
        console.error('Upload error:', error);
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: { status: 'error', progress: 0, error: error.message }
        }));
      }
    }

    // Reload recent uploads
    setTimeout(() => {
      loadRecentUploads();
      setFiles([]);
      setUploadProgress({});
      setUploading(false);
    }, 3000);
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

  const uploadTips = [
    {
      icon: Brain,
      title: "AI-Powered Processing",
      description: "Documents are automatically analyzed and indexed for intelligent search and insights."
    },
    {
      icon: Tag,
      title: "Smart Categorization", 
      description: "AI suggests categories and tags based on document content to improve organization."
    },
    {
      icon: Sparkles,
      title: "Legacy Data Integration",
      description: "Mark historical data to preserve context while distinguishing from current information."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Feed</h1>
          <p className="text-gray-600">Upload and organize documents to build your AI-powered knowledge base</p>
        </div>
        <button 
          onClick={loadRecentUploads}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Upload Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {uploadTips.map((tip, index) => (
          <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <tip.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900 mb-1">{tip.title}</h3>
                <p className="text-sm text-blue-800">{tip.description}</p>
              </div>
            </div>
          </div>
        ))}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} {cat.aiSuggested ? '(AI Suggested)' : ''}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={isLegacyData}
                  onChange={(e) => setIsLegacyData(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Legacy Data</span>
              </label>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-500 mb-4">
              Supports PDF, Word, Excel, images, and text files up to 10MB each
            </p>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                            <select
                              value={fileData.category}
                              onChange={(e) => updateFileCategory(fileData.id, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            >
                              {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
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
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-center">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={fileData.isLegacy}
                                onChange={(e) => updateFileLegacy(fileData.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-xs text-gray-700">Legacy Data</span>
                            </label>
                          </div>
                        </div>

                        {/* Upload Progress */}
                        {uploadProgress[fileData.id] && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">
                                {uploadProgress[fileData.id].status === 'uploading' && 'Uploading...'}
                                {uploadProgress[fileData.id].status === 'processing' && 'Processing...'}
                                {uploadProgress[fileData.id].status === 'completed' && 'Completed'}
                                {uploadProgress[fileData.id].status === 'error' && 'Error'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {uploadProgress[fileData.id].progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  uploadProgress[fileData.id].status === 'error' 
                                    ? 'bg-red-500' 
                                    : uploadProgress[fileData.id].status === 'completed'
                                    ? 'bg-green-500'
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${uploadProgress[fileData.id].progress}%` }}
                              ></div>
                            </div>
                            {uploadProgress[fileData.id].error && (
                              <p className="text-xs text-red-600 mt-1">
                                {uploadProgress[fileData.id].error}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={uploading || files.length === 0}
                  className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div key={upload.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getFileIcon(upload.filename)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{upload.filename}</h4>
                      <p className="text-sm text-gray-500">
                        Uploaded {new Date(upload.uploadedAt).toLocaleString()}
                      </p>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                        {upload.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {upload.status === 'processing' && (
                      <div className="flex items-center text-blue-600">
                        <Clock className="w-4 h-4 mr-1 animate-pulse" />
                        <span className="text-sm">Processing</span>
                      </div>
                    )}
                    {upload.status === 'completed' && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Ready</span>
                      </div>
                    )}
                    {upload.status === 'error' && (
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Error</span>
                      </div>
                    )}
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Lightbulb className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-indigo-900 mb-2">Upload Best Practices</h3>
            <ul className="text-sm text-indigo-800 space-y-1">
              <li>• Use descriptive filenames that reflect document content</li>
              <li>• Choose appropriate categories to improve AI understanding</li>
              <li>• Add relevant tags for better searchability and organization</li>
              <li>• Mark historical data as "Legacy" to preserve context</li>
              <li>• Ensure documents are text-searchable PDFs when possible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeFeed;