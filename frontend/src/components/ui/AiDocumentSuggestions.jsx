// frontend/src/components/ui/AiDocumentSuggestions.jsx
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

  if (!isVisible) return null;

  return (
    <div className="space-y-3">
      {/* Compact Header with Insights */}
      {insights && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <Brain className="w-4 h-4 text-purple-600" />
            <div className="text-sm">
              <span className="font-medium text-purple-900">
                {suggestions.length} AI suggestions
              </span>
              <span className="text-purple-700 ml-2">
                • Avg score: {(insights.avgScore * 100).toFixed(0)}%
              </span>
              {insights.userBased && (
                <span className="text-purple-700 ml-2">• Personalized</span>
              )}
            </div>
          </div>
          <button
            onClick={handleRefreshSuggestions}
            disabled={refreshing}
            className="text-purple-600 hover:text-purple-700 p-1 rounded"
            title="Refresh suggestions"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Loading State - Compact */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-sm text-gray-600">Finding suggestions...</span>
        </div>
      )}

      {/* Compact Suggestions List */}
      {!loading && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <CompactSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              index={index}
              isSelected={selectedDocuments.some(d => d.id === suggestion.id)}
              feedback={feedback[suggestion.id]}
              onSelect={() => onDocumentSelect(suggestion)}
              onFeedback={(type) => handleDocumentFeedback(suggestion.id, type)}
            />
          ))}
          
          {suggestions.length > 5 && (
            <div className="text-center py-2">
              <span className="text-xs text-gray-500">
                Showing top 5 of {suggestions.length} suggestions
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty State - Compact */}
      {!loading && suggestions.length === 0 && (
        <div className="text-center py-4">
          <Brain className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">No suggestions available</p>
          <p className="text-xs text-gray-500 mb-3">
            Upload more documents or generate content to improve AI recommendations
          </p>
          <button
            onClick={handleRefreshSuggestions}
            className="text-xs text-purple-600 hover:text-purple-700"
          >
            Refresh suggestions
          </button>
        </div>
      )}

      {/* Learning Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
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

// Compact Suggestion Card Component
const CompactSuggestionCard = ({ 
  suggestion, 
  index, 
  isSelected, 
  feedback,
  onSelect, 
  onFeedback 
}) => {
  const scoreColor = getScoreColor(suggestion.adaptiveScore);
  const confidenceColor = getConfidenceColor(suggestion.confidenceLevel);

  return (
    <div className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
      isSelected 
        ? 'border-purple-500 bg-purple-50' 
        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
    }`}>
      
      {/* Left side - Document info */}
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
          index < 3 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {suggestion.originalName}
            </h4>
            {suggestion.learningBased && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full flex-shrink-0">
                <Sparkles className="w-2.5 h-2.5 mr-1" />
                AI
              </span>
            )}
          </div>
          
          {/* Recommendation reason - truncated */}
          {suggestion.recommendationReason && (
            <p className="text-xs text-gray-600 mb-1 line-clamp-1">
              {suggestion.recommendationReason}
            </p>
          )}
          
          <div className="flex items-center space-x-3">
            <span className={`text-xs font-medium ${scoreColor}`}>
              {(suggestion.adaptiveScore * 100).toFixed(0)}%
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${confidenceColor}`}>
              {suggestion.confidenceLevel}
            </span>
            {suggestion.category && (
              <span className="text-xs text-gray-500 truncate">{suggestion.category}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Right side - Actions */}
      <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
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
        
        {/* Feedback */}
        {!feedback ? (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onFeedback('helpful')}
              className="p-1 text-gray-400 hover:text-green-600 rounded"
              title="Helpful"
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
        ) : (
          <div className="flex items-center">
            {feedback === 'helpful' ? (
              <ThumbsUp className="w-3 h-3 text-green-600" />
            ) : (
              <ThumbsDown className="w-3 h-3 text-red-600" />
            )}
          </div>
        )}
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