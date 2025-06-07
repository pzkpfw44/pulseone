// frontend/src/components/ui/DocumentSelector.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, Eye, Check, X, 
  AlertCircle, Calendar, User, Tag, ChevronDown,
  ChevronUp, Download, BookOpen, Shield, Building,
  BarChart3, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import api from '../../services/api';

const DocumentSelector = ({ 
  isOpen, 
  onClose, 
  onDocumentsSelected, 
  selectedDocuments = [],
  templateId,
  maxSelections = 10
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [previewDocument, setPreviewDocument] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [localSelectedDocs, setLocalSelectedDocs] = useState(selectedDocuments);
  const [documentRelevance, setDocumentRelevance] = useState({});
  const [categories, setCategories] = useState([]);

  // Template-specific document recommendations
  const templateRecommendations = {
    'job-descriptions': {
      priority: ['job_frameworks', 'policies_procedures', 'organizational_guidelines'],
      searchTerms: ['job description', 'role', 'competency', 'skills', 'qualifications'],
      description: 'Select documents containing job descriptions, competency frameworks, and HR policies'
    },
    'policy-generator': {
      priority: ['policies_procedures', 'compliance_documents', 'organizational_guidelines'],
      searchTerms: ['policy', 'procedure', 'compliance', 'regulation', 'guideline'],
      description: 'Select documents containing existing policies, legal requirements, and compliance materials'
    },
    'procedure-docs': {
      priority: ['policies_procedures', 'training_materials', 'compliance_documents'],
      searchTerms: ['procedure', 'process', 'workflow', 'training', 'safety', 'operation'],
      description: 'Select documents containing operational procedures, safety guidelines, and process documentation'
    },
    'functional-booklet': {
      priority: ['organizational_guidelines', 'job_frameworks', 'policies_procedures'],
      searchTerms: ['organizational', 'structure', 'hierarchy', 'role', 'department', 'reporting'],
      description: 'Select documents containing organizational charts, role definitions, and hierarchy information'
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
      fetchCategories();
    }
  }, [isOpen, templateId]);

  useEffect(() => {
    if (templateId && documents.length > 0) {
      calculateDocumentRelevance();
    }
  }, [templateId, documents]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // Try the company library endpoint first
      let response;
      try {
        response = await api.get('/company-library/fed-documents', {
          params: {
            includeChunks: false,
            status: 'processed',
            limit: 1000 // Get more documents for selection
          }
        });
        
        if (response.data.success && response.data.documents) {
          // Transform the response to match expected format
          const transformedDocs = response.data.documents.map(doc => ({
            id: doc.id,
            originalName: doc.filename,
            category: doc.category,
            size: doc.size,
            summary: doc.summary,
            aiGeneratedTags: doc.tags || [],
            userTags: [],
            createdAt: doc.uploadedAt,
            status: doc.status,
            wordCount: doc.wordCount,
            metadata: { wordCount: doc.wordCount }
          }));
          setDocuments(transformedDocs);
        }
      } catch (fedDocsError) {
        console.warn('Fed documents endpoint failed, trying alternative:', fedDocsError.message);
        
        // Fallback to the original documents endpoint
        response = await api.get('/company-library/documents', {
          params: {
            includeChunks: false,
            status: 'processed'
          }
        });

        if (response.data.success) {
          setDocuments(response.data.documents || []);
        }
      }

      // If still no documents, check if any exist at all
      if (!response.data.documents || response.data.documents.length === 0) {
        try {
          const overviewResponse = await api.get('/company-library/overview');
          if (overviewResponse.data.success) {
            const totalDocs = overviewResponse.data.overview.fedDocuments;
            if (totalDocs === 0) {
              console.log('No documents found in library');
            } else {
              console.warn(`Library shows ${totalDocs} documents but none returned by API`);
            }
          }
        } catch (overviewError) {
          console.warn('Could not fetch library overview:', overviewError.message);
        }
      }

    } catch (error) {
      console.error('Error fetching documents:', error);
      // Show user-friendly error message
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/company-library/categories');
      if (response.data.success) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const calculateDocumentRelevance = () => {
    const template = templateRecommendations[templateId];
    if (!template) return;

    const relevanceScores = {};
    
    documents.forEach(doc => {
      let score = 0;
      
      // Category relevance (40% weight)
      if (template.priority.includes(doc.category)) {
        const categoryIndex = template.priority.indexOf(doc.category);
        score += (3 - categoryIndex) * 0.4;
      }
      
      // Content relevance (40% weight)
      const docText = `${doc.originalName} ${doc.summary || ''} ${doc.aiGeneratedTags?.join(' ') || ''}`.toLowerCase();
      template.searchTerms.forEach(term => {
        if (docText.includes(term.toLowerCase())) {
          score += 0.4 / template.searchTerms.length;
        }
      });
      
      // Recency bonus (20% weight)
      const daysSinceUpload = (Date.now() - new Date(doc.createdAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceUpload < 30) score += 0.2;
      else if (daysSinceUpload < 90) score += 0.1;
      
      relevanceScores[doc.id] = Math.min(score, 1); // Cap at 1.0
    });
    
    setDocumentRelevance(relevanceScores);
  };

  const handleDocumentToggle = (doc) => {
    const isSelected = localSelectedDocs.some(d => d.id === doc.id);
    
    if (isSelected) {
      setLocalSelectedDocs(prev => prev.filter(d => d.id !== doc.id));
    } else {
      if (localSelectedDocs.length >= maxSelections) {
        alert(`Maximum ${maxSelections} documents can be selected`);
        return;
      }
      setLocalSelectedDocs(prev => [...prev, doc]);
    }
  };

  const handlePreviewDocument = async (doc) => {
    setPreviewDocument(doc);
    setShowPreview(true);
    
    // Fetch document content for preview
    try {
      const response = await api.get(`/company-library/documents/${doc.id}`, {
        params: { includeChunks: true, maxChunks: 5 }
      });
      
      if (response.data.success) {
        setPreviewDocument({
          ...doc,
          chunks: response.data.document.chunks || []
        });
      }
    } catch (error) {
      console.error('Error fetching document content:', error);
    }
  };

  const handleConfirmSelection = () => {
    onDocumentsSelected(localSelectedDocs);
    onClose();
  };

  const getRelevanceColor = (score) => {
    if (score >= 0.7) return 'text-green-600 bg-green-100';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getRelevanceLabel = (score) => {
    if (score >= 0.7) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  const sortedAndFilteredDocuments = documents
    .filter(doc => {
      const matchesSearch = searchTerm === '' || 
        doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.aiGeneratedTags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (documentRelevance[b.id] || 0) - (documentRelevance[a.id] || 0);
        case 'name':
          return a.originalName.localeCompare(b.originalName);
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        default:
          return 0;
      }
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select Documents</h2>
            <p className="text-sm text-gray-600 mt-1">
              {templateRecommendations[templateId]?.description || 'Choose documents to enhance generation accuracy'}
            </p>
            <div className="flex items-center mt-2 text-sm text-blue-600">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {localSelectedDocs.length} of {maxSelections} documents selected
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Template Recommendations */}
        {templateRecommendations[templateId] && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-start space-x-3">
              <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Recommended for {templateRecommendations[templateId].description.split(' ')[0]} Generation</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Prioritized categories: {templateRecommendations[templateId].priority.map(cat => 
                    categories.find(c => c.name === cat)?.description || cat
                  ).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center space-x-4 p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.name} value={category.name}>
                  {category.description || category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="relevance">Relevance</option>
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading documents...</span>
            </div>
          ) : sortedAndFilteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {documents.length === 0 ? 'No documents in library' : 'No documents found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {documents.length === 0 
                  ? 'Upload documents to your company library to get started'
                  : searchTerm || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'No documents match the current filters'
                }
              </p>
              {documents.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Troubleshooting:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Check if documents have been uploaded to the Company Library</li>
                    <li>• Ensure documents have been processed successfully</li>
                    <li>• Try refreshing the page</li>
                  </ul>
                  <button
                    onClick={fetchDocuments}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Retry Loading Documents
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sortedAndFilteredDocuments.map(doc => {
                const isSelected = localSelectedDocs.some(d => d.id === doc.id);
                const relevanceScore = documentRelevance[doc.id] || 0;
                
                return (
                  <div
                    key={doc.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex items-center mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleDocumentToggle(doc)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {doc.originalName}
                            </h3>
                            {templateId && relevanceScore > 0 && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRelevanceColor(relevanceScore)}`}>
                                {getRelevanceLabel(relevanceScore)} relevance
                              </span>
                            )}
                          </div>
                          
                          {doc.summary && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {doc.summary}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center">
                              <Tag className="w-3 h-3 mr-1" />
                              {categories.find(c => c.name === doc.category)?.description || doc.category || 'Uncategorized'}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <BarChart3 className="w-3 h-3 mr-1" />
                              {(doc.size / 1024).toFixed(1)} KB
                            </div>
                            {doc.wordCount && (
                              <div className="flex items-center">
                                <FileText className="w-3 h-3 mr-1" />
                                {doc.wordCount} words
                              </div>
                            )}
                          </div>
                          
                          {doc.aiGeneratedTags && doc.aiGeneratedTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doc.aiGeneratedTags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {doc.aiGeneratedTags.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{doc.aiGeneratedTags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handlePreviewDocument(doc)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded"
                          title="Preview document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {documents.length > 0 ? (
              <>
                {sortedAndFilteredDocuments.length} of {documents.length} documents shown
                {templateId && Object.keys(documentRelevance).length > 0 && (
                  <span className="ml-2">
                    • Sorted by relevance to {templateRecommendations[templateId]?.description.split(' ')[0]} generation
                  </span>
                )}
              </>
            ) : (
              <span>No documents available in library</span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={localSelectedDocs.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use Selected Documents ({localSelectedDocs.length})
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {showPreview && previewDocument && (
        <DocumentPreview
          document={previewDocument}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

// Document Preview Component
const DocumentPreview = ({ document, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{document.originalName}</h3>
            <p className="text-sm text-gray-600 mt-1">Document preview</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {document.summary && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
              <p className="text-blue-800">{document.summary}</p>
            </div>
          )}
          
          {document.chunks && document.chunks.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Content Preview</h4>
              {document.chunks.map((chunk, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Section {index + 1}</div>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {chunk.content.substring(0, 500)}
                    {chunk.content.length > 500 && '...'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Content preview not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentSelector;