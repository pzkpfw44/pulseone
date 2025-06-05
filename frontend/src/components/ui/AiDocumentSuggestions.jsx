// frontend/src/components/ui/AiDocumentSuggestions.jsx - Phase 3
import React, { useState, useEffect } from 'react';
import { 
  Brain, Sparkles, TrendingUp, FileText, CheckCircle, 
  AlertCircle, Info, ArrowRight, Clock, Target, Users,
  Zap, BookOpen, Star, ThumbsUp, ThumbsDown, RefreshCw,
  Eye, Plus, X, BarChart3, Activity
} from 'lucide-react';
import api from '../../services/api';

const AiDocumentSuggestions = ({ 
  templateId, 
  userContext, 
  onDocumentSelect, 
  selectedDocuments = [],
  isVisible = true 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [showDetails, setShowDetails] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (templateId && isVisible) {
      fetchSmartSuggestions();
    }
  }, [templateId, isVisible, userContext]);

  const fetchSmartSuggestions = async () => {
    setLoading(true);
    try {
      const response = await api.post('/smart-rag/document-recommendations', {
        templateId,
        userContext,
        excludeDocuments: selectedDocuments.map(d => d.id),
        includeInsights: true
      });

      if (response.data.success) {
        setSuggestions(response.data.recommendations || []);
        setInsights(response.data.metadata || null);
      }
    } catch (error) {
      console.error('Error fetching smart suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSuggestions = async () => {
    setRefreshing(true);
    await fetchSmartSuggestions();
    setRefreshing(false);
  };

  const handleDocumentFeedback = async (documentId, feedbackType) => {
    try {
      await api.post('/smart-rag/document-feedback', {
        documentId,
        templateId,
        feedbackType,
        userContext
      });

      setFeedback(prev => ({
        ...prev,
        [documentId]: feedbackType
      }));

      // Refresh suggestions to reflect learning
      setTimeout(() => {
        fetchSmartSuggestions();
      }, 1000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const toggleDetails = (documentId) => {
    setShowDetails(prev => ({
      ...prev,
      [documentId]: !prev[documentId]
    }));
  };

  const getConfidenceColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">AI Document Suggestions</h3>
            <p className="text-sm text-gray-600">
              Intelligent recommendations based on learning and patterns
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefreshSuggestions}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Refresh suggestions"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          {insights && (
            <div className="text-xs text-gray-500">
              {insights.learningApplied ? 'AI Enhanced' : 'Standard'}
            </div>
          )}
        </div>
      </div>

      {/* AI Insights Panel */}
      {insights && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-purple-900 mb-2">AI Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">
                    Avg Score: <span className="font-medium">{(insights.avgScore * 100).toFixed(0)}%</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">
                    Candidates: <span className="font-medium">{insights.totalCandidates}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700">
                    {insights.userBased ? 'Personalized' : 'Pattern-Based'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-gray-600">Analyzing documents...</span>
        </div>
      )}

      {/* Suggestions List */}
      {!loading && suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              index={index}
              isSelected={selectedDocuments.some(d => d.id === suggestion.id)}
              showDetails={showDetails[suggestion.id]}
              feedback={feedback[suggestion.id]}
              onSelect={() => onDocumentSelect(suggestion)}
              onToggleDetails={() => toggleDetails(suggestion.id)}
              onFeedback={(type) => handleDocumentFeedback(suggestion.id, type)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && suggestions.length === 0 && (
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No AI Suggestions Available</h4>
          <p className="text-gray-600">
            Upload more documents or generate content to improve AI recommendations
          </p>
        </div>
      )}

      {/* Learning Notice */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">AI Learning System</p>
            <p>
              Suggestions improve over time based on your usage patterns and feedback. 
              Help train the AI by providing feedback on recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual Suggestion Card Component
const SuggestionCard = ({ 
  suggestion, 
  index, 
  isSelected, 
  showDetails, 
  feedback,
  onSelect, 
  onToggleDetails, 
  onFeedback 
}) => {
  const confidenceColor = getConfidenceColor(suggestion.confidenceLevel);
  const scoreColor = getScoreColor(suggestion.adaptiveScore);

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isSelected 
        ? 'border-purple-500 bg-purple-50' 
        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Ranking Badge */}
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            index < 3 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {index + 1}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {suggestion.originalName}
              </h4>
              
              {/* AI Enhancement Badge */}
              {suggestion.learningBased && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Enhanced
                </span>
              )}
            </div>
            
            {/* Recommendation Reason */}
            <p className="text-sm text-gray-600 mb-2">
              {suggestion.recommendationReason}
            </p>
            
            {/* Metrics Row */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <Target className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Score:</span>
                <span className={`font-medium ${scoreColor}`}>
                  {(suggestion.adaptiveScore * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Activity className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Confidence:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${confidenceColor}`}>
                  {suggestion.confidenceLevel}
                </span>
              </div>
              
              {suggestion.category && (
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500">{suggestion.category}</span>
                </div>
              )}
            </div>
            
            {/* Additional Details */}
            {showDetails && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-medium text-gray-700">Size:</span>
                    <span className="ml-1 text-gray-600">
                      {(suggestion.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-1 text-gray-600">
                      {new Date(suggestion.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {suggestion.summary && (
                  <div className="mt-2">
                    <span className="font-medium text-gray-700 text-xs">Summary:</span>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {suggestion.summary}
                    </p>
                  </div>
                )}
                
                {suggestion.aiGeneratedTags && suggestion.aiGeneratedTags.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium text-gray-700 text-xs">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {suggestion.aiGeneratedTags.slice(0, 3).map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {suggestion.aiGeneratedTags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{suggestion.aiGeneratedTags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4">
          {/* Details Toggle */}
          <button
            onClick={onToggleDetails}
            className="p-2 text-gray-400 hover:text-gray-600 rounded"
            title="Toggle details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {/* Add/Remove Button */}
          <button
            onClick={onSelect}
            className={`p-2 rounded transition-colors ${
              isSelected
                ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
            }`}
            title={isSelected ? 'Remove document' : 'Add document'}
          >
            {isSelected ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
          
          {/* Feedback Buttons */}
          {!feedback && (
            <div className="flex items-center space-x-1 border-l pl-2 ml-2">
              <button
                onClick={() => onFeedback('helpful')}
                className="p-1 text-gray-400 hover:text-green-600 rounded"
                title="Helpful suggestion"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => onFeedback('not-helpful')}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Not helpful"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>
            </div>
          )}
          
          {/* Feedback Status */}
          {feedback && (
            <div className="flex items-center space-x-1 border-l pl-2 ml-2">
              {feedback === 'helpful' ? (
                <ThumbsUp className="w-3 h-3 text-green-600" />
              ) : (
                <ThumbsDown className="w-3 h-3 text-red-600" />
              )}
              <span className="text-xs text-gray-500">Thanks!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getConfidenceColor = (level) => {
  switch (level?.toLowerCase()) {
    case 'high': return 'text-green-600 bg-green-100';
    case 'medium': return 'text-yellow-600 bg-yellow-100';
    case 'low': return 'text-orange-600 bg-orange-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const getScoreColor = (score) => {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-yellow-600';
  if (score >= 0.4) return 'text-orange-600';
  return 'text-red-600';
};

export default AiDocumentSuggestions;