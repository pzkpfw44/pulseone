// frontend/src/pages/CompanyLibrary.jsx - Enhanced Implementation
import React, { useState, useEffect } from 'react';
import {
  FolderOpen, Search, Filter, Download, Eye, Edit2, Trash2, 
  Plus, Tag, Calendar, FileText, Brain, Database, Globe,
  BarChart3, RefreshCw, Settings, ChevronDown, ChevronRight,
  Upload, Star, Archive, Share, ExternalLink, Zap
} from 'lucide-react';
import api from '../services/api';

const CompanyLibrary = () => {
  const [activeTab, setActiveTab] = useState('fed-documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  
  // Data states
  const [fedDocuments, setFedDocuments] = useState([]);
  const [generatedDocuments, setGeneratedDocuments] = useState([]);
  const [externalConnections, setExternalConnections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  // Modal states
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tabs = [
    {
      id: 'fed-documents',
      name: 'Knowledge Base',
      icon: Database,
      description: 'Documents from Knowledge Feed',
      count: fedDocuments.length
    },
    {
      id: 'generated-documents', 
      name: 'Generated Content',
      icon: Brain,
      description: 'AI-generated documents',
      count: generatedDocuments.length
    },
    {
      id: 'external-connections',
      name: 'External Sources',
      icon: Globe,
      description: 'Connected repositories',
      count: externalConnections.length
    }
  ];

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    setLoading(true);
    try {
      // Load overview/stats first
      const overviewResponse = await api.get('/company-library/overview');
      const overview = overviewResponse.data;
      
      // Load fed documents from company library
      const fedDocsResponse = await api.get('/company-library/fed-documents?limit=100');
      setFedDocuments(fedDocsResponse.data?.documents || []);

      // Load generated documents - FIXED ENDPOINT
      const generatedDocsResponse = await api.get('/company-library/generated-documents?limit=100');
      setGeneratedDocuments(generatedDocsResponse.data?.documents || []);

      // Load external connections
      const externalResponse = await api.get('/company-library/external-connections');
      setExternalConnections(externalResponse.data?.connections || []);

      // Use overview data for categories and stats
      setCategories(overview?.categories || []);

      // Extract unique tags from fed documents
      const allTags = new Set();
      (fedDocsResponse.data?.documents || []).forEach(doc => {
        doc.tags?.forEach(tag => allTags.add(tag));
      });
      setTags(Array.from(allTags));

      // Set stats from overview
      setStats({
        totalDocuments: overview?.overview?.totalDocuments || 0,
        totalCategories: overview?.overview?.totalCategories || 0,
        totalTags: allTags.size,
        recentUploads: overview?.overview?.recentUploads || 0
      });

    } catch (error) {
      console.error('Error loading library data:', error);
      
      // Fallback to empty arrays if API calls fail
      setFedDocuments([]);
      setGeneratedDocuments([]);
      setExternalConnections([]);
      setCategories([]);
      setTags([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = () => {
    let docs = [];
    
    if (activeTab === 'fed-documents') {
      docs = fedDocuments;
    } else if (activeTab === 'generated-documents') {
      docs = generatedDocuments;
    } else {
      return externalConnections;
    }

    // Apply filters
    if (searchQuery) {
      docs = docs.filter(doc => 
        doc.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory) {
      docs = docs.filter(doc => doc.category === selectedCategory);
    }

    if (selectedTags.length > 0) {
      docs = docs.filter(doc => 
        selectedTags.some(tag => doc.tags?.includes(tag))
      );
    }

    // Apply sorting
    docs.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.filename || a.title || '').localeCompare(b.filename || b.title || '');
        case 'name-desc':
          return (b.filename || b.title || '').localeCompare(a.filename || a.title || '');
        case 'date-asc':
          // FIX: Use Date.parse() for numeric comparison, avoiding non-serializable Date objects.
          return Date.parse(a.uploadedAt || a.createdAt) - Date.parse(b.uploadedAt || b.createdAt);
        case 'date-desc':
        default:
          // FIX: Use Date.parse() for numeric comparison, avoiding non-serializable Date objects.
          return Date.parse(b.uploadedAt || b.createdAt) - Date.parse(a.uploadedAt || a.createdAt);
      }
    });

    return docs;
  };

  const handleDocumentAction = async (action, document) => {
    switch (action) {
      case 'preview':
        setSelectedDocument(document);
        setShowPreview(true);
        break;
      case 'download':
        await downloadDocument(document);
        break;
      case 'edit':
        setSelectedDocument(document);
        setShowEditModal(true);
        break;
      case 'delete':
        setSelectedDocument(document);
        setShowDeleteConfirm(true);
        break;
      case 'add-to-knowledge':
        await addToKnowledgeBase(document);
        break;
      case 'star':
        await toggleStar(document);
        break;
    }
  };

  const downloadDocument = async (document) => {
    try {
      let downloadUrl = '';
      
      if (activeTab === 'fed-documents') {
        downloadUrl = `/api/knowledge-feed/download/${document.id}`;
      } else if (activeTab === 'generated-documents') {
        downloadUrl = `/api/ai-content-studio/download/${document.id}`;
      }

      const response = await api.get(downloadUrl, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.filename || document.title || 'document';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const addToKnowledgeBase = async (document) => {
    try {
      await api.post('/ai-content-studio/add-to-knowledge', {
        documentId: document.id
      });
      
      // Refresh data
      loadLibraryData();
      
      // Show success message
      alert('Document added to knowledge base successfully!');
    } catch (error) {
      console.error('Failed to add to knowledge base:', error);
      alert('Failed to add document to knowledge base');
    }
  };

  // FIX: Create a helper function to safely format date strings for display.
  const SafeFormattedDate = ({ dateString }) => {
    if (!dateString) return null;
    try {
      // Only create the Date object for formatting, it doesn't get stored in state.
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      // If the date string is invalid, return it as is or return nothing.
      return dateString; 
    }
  };
  
  const DocumentCard = ({ document, type }) => {
    // Handle different field names between fed documents and generated documents
    const getDocumentTitle = () => {
      if (type === 'generated') {
        return document.title || document.templateTitle || 'Untitled Document';
      }
      return document.filename || document.originalName || 'Untitled Document';
    };

    const getDocumentDate = () => {
      return document.uploadedAt || document.createdAt;
    };

    const getDocumentSize = () => {
      if (type === 'generated') {
        return document.wordCount ? `${document.wordCount} words` : '';
      }
      return document.size ? `${(document.size / 1024).toFixed(1)} KB` : '';
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {getDocumentTitle()}
              </h3>
              <p className="text-xs text-gray-500">
                {document.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                    {document.category.replace('_', ' ')}
                  </span>
                )}
                {/* FIX: Use the safe date formatting component */}
                <SafeFormattedDate dateString={getDocumentDate()} />
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleDocumentAction('preview', document)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDocumentAction('download', document)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            {type === 'generated' && (
              <button
                onClick={() => handleDocumentAction('add-to-knowledge', document)}
                className="p-1 text-blue-400 hover:text-blue-600"
                title="Add to Knowledge Base"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleDocumentAction('edit', document)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {document.summary && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {document.summary}
          </p>
        )}

        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {document.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
            {document.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{document.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {getDocumentSize()}
            {type === 'generated' && document.legalFramework && (
              <span> • {document.legalFramework}</span>
            )}
          </span>
          {type === 'fed' && document.processingMethod && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              document.processingMethod === 'ai-enhanced' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {document.processingMethod === 'ai-enhanced' ? '🤖 AI' : '🔍 Pattern'}
            </span>
          )}
          {type === 'generated' && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
              🤖 Generated
            </span>
          )}
        </div>
      </div>
    );
  };

  const ExternalConnectionCard = ({ connection }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            connection.status === 'connected' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Globe className={`w-5 h-5 ${
              connection.status === 'connected' ? 'text-green-600' : 'text-gray-600'
            }`} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{connection.name}</h3>
            <p className="text-xs text-gray-500">{connection.type}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          connection.status === 'connected'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {connection.status}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {connection.documents} documents
        </span>
        <div className="flex space-x-2">
          <button className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
            Configure
          </button>
          {connection.status === 'connected' && (
            <button className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded">
              Sync
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">Loading library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Library</h1>
          <p className="text-gray-600">Manage and explore your organization's knowledge base</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadLibraryData}
            className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button className="inline-flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalDocuments || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Tag className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalCategories || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">AI Generated</p>
              <p className="text-2xl font-semibold text-gray-900">{generatedDocuments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Uploads</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.recentUploads || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {activeTab !== 'external-connections' && (
              <>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name.replace('_', ' ')}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'external-connections' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments().map((connection) => (
                <ExternalConnectionCard key={connection.id} connection={connection} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments().map((document) => (
                <DocumentCard 
                  key={document.id} 
                  document={document} 
                  type={activeTab === 'generated-documents' ? 'generated' : 'fed'}
                />
              ))}
            </div>
          )}

          {filteredDocuments().length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">No documents found</h3>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search criteria' : 'Upload documents to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyLibrary;