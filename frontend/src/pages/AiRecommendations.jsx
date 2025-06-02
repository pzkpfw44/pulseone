import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Clock, 
  Star, ArrowRight, Filter, Search, Bookmark, BookmarkCheck,
  Target, Users, BarChart3, RefreshCw, Brain, Zap
} from 'lucide-react';
import api from '../services/api';

const AiRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const response = await api.get('/recommendations');
      setRecommendations(response.data || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      // Mock data for development
      setRecommendations([
        {
          id: 1,
          type: 'performance',
          priority: 'high',
          title: 'Address Leadership Development Gap',
          description: 'AI analysis shows 73% of managers scored below 3.5 in "Developing Others" across recent 360 reviews.',
          impact: 'High',
          effort: 'Medium',
          category: 'Leadership',
          confidence: 0.92,
          actionItems: [
            'Implement leadership coaching program',
            'Provide mentorship training workshops',
            'Create peer learning groups'
          ],
          dataSource: 'Pulse 360 Feedback Data',
          createdAt: new Date('2024-12-15'),
          status: 'new'
        },
        {
          id: 2,
          type: 'risk',
          priority: 'high',
          title: 'Retention Risk in Engineering Team',
          description: 'Pattern analysis indicates 67% of engineering staff show signs of disengagement in recent surveys.',
          impact: 'Very High',
          effort: 'Low',
          category: 'Retention',
          confidence: 0.87,
          actionItems: [
            'Conduct stay interviews with at-risk employees',
            'Review compensation and benefits',
            'Implement flexible work arrangements'
          ],
          dataSource: 'Cross-module Analysis',
          createdAt: new Date('2024-12-14'),
          status: 'in_progress'
        },
        {
          id: 3,
          type: 'opportunity',
          priority: 'medium',
          title: 'Enhance Onboarding Experience',
          description: 'New hire feedback suggests 45% would benefit from extended mentorship during first 90 days.',
          impact: 'Medium',
          effort: 'Low',
          category: 'Onboarding',
          confidence: 0.78,
          actionItems: [
            'Extend buddy system to 90 days',
            'Add monthly check-ins with HR',
            'Create role-specific learning paths'
          ],
          dataSource: 'Onboarding Survey Data',
          createdAt: new Date('2024-12-12'),
          status: 'new'
        },
        {
          id: 4,
          type: 'performance',
          priority: 'low',
          title: 'Optimize Meeting Culture',
          description: 'Calendar analysis shows 34% of employees spend over 60% of time in meetings, impacting productivity.',
          impact: 'Medium',
          effort: 'High',
          category: 'Productivity',
          confidence: 0.65,
          actionItems: [
            'Implement no-meeting Fridays',
            'Audit recurring meetings',
            'Train managers on effective meeting practices'
          ],
          dataSource: 'Calendar & Productivity Analytics',
          createdAt: new Date('2024-12-10'),
          status: 'completed'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'performance': return BarChart3;
      case 'risk': return AlertTriangle;
      case 'opportunity': return Target;
      default: return Lightbulb;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      case 'new': return Star;
      default: return Star;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'new': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const toggleBookmark = (id) => {
    const newBookmarked = new Set(bookmarkedIds);
    if (newBookmarked.has(id)) {
      newBookmarked.delete(id);
    } else {
      newBookmarked.add(id);
    }
    setBookmarkedIds(newBookmarked);
  };

  const filteredRecommendations = recommendations.filter(rec => {
    const matchesFilter = filter === 'all' || rec.priority === filter || rec.type === filter || rec.status === filter;
    const matchesSearch = rec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rec.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const recommendationCounts = {
    total: recommendations.length,
    high_priority: recommendations.filter(r => r.priority === 'high').length,
    new: recommendations.filter(r => r.status === 'new').length,
    in_progress: recommendations.filter(r => r.status === 'in_progress').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Recommendations</h1>
          <p className="text-gray-600">Proactive insights and suggestions powered by AI analysis</p>
        </div>
        <button 
          onClick={loadRecommendations}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Insights
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lightbulb className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Recommendations</p>
              <p className="text-2xl font-semibold text-gray-900">{recommendationCounts.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-semibold text-gray-900">{recommendationCounts.high_priority}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Insights</p>
              <p className="text-2xl font-semibold text-gray-900">{recommendationCounts.new}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-semibold text-gray-900">{recommendationCounts.in_progress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search recommendations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Recommendations</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="performance">Performance</option>
              <option value="risk">Risk</option>
              <option value="opportunity">Opportunity</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Brain className="w-4 h-4" />
            <span>Powered by AI Analysis</span>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
            <p className="mt-2 text-gray-500">Loading AI recommendations...</p>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recommendations found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or check back later for new insights.</p>
          </div>
        ) : (
          filteredRecommendations.map((rec) => {
            const TypeIcon = getTypeIcon(rec.type);
            const StatusIcon = getStatusIcon(rec.status);
            const isBookmarked = bookmarkedIds.has(rec.id);
            
            return (
              <div key={rec.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <TypeIcon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{rec.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(rec.priority)}`}>
                            {rec.priority} priority
                          </span>
                          <div className="flex items-center space-x-1">
                            <StatusIcon className={`w-4 h-4 ${getStatusColor(rec.status)}`} />
                            <span className={`text-xs font-medium ${getStatusColor(rec.status)}`}>
                              {rec.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-4">{rec.description}</p>
                        
                        {/* Metrics */}
                        <div className="flex items-center space-x-6 mb-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Impact:</span>
                            <span className="text-sm text-gray-600">{rec.impact}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Effort:</span>
                            <span className="text-sm text-gray-600">{rec.effort}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Confidence:</span>
                            <span className="text-sm text-gray-600">{Math.round(rec.confidence * 100)}%</span>
                          </div>
                        </div>

                        {/* Action Items */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Actions:</h4>
                          <ul className="space-y-1">
                            {rec.actionItems.map((item, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <ArrowRight className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                                <span className="text-sm text-gray-600">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="inline-flex items-center">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            {rec.dataSource}
                          </span>
                          <span className="inline-flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                          <span className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {rec.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => toggleBookmark(rec.id)}
                        className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <Bookmark className="w-5 h-5" />
                        )}
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Take Action
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Insights Footer */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 mb-2">How AI Recommendations Work</h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              Our AI continuously analyzes patterns across all your HR data sources - from 360 feedback to performance metrics. 
              It identifies trends, predicts potential issues, and suggests actionable interventions based on proven best practices 
              and your organization's unique context. Recommendations are ranked by potential impact and implementation effort.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiRecommendations;