// frontend/src/pages/Analytics.jsx - Phase 3 Analytics Dashboard
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, FileText, Users, Clock, Target,
  Brain, Zap, ChevronDown, ChevronUp, Filter, Calendar,
  Download, RefreshCw, AlertCircle, CheckCircle, Info,
  ArrowUp, ArrowDown, Minus, Eye, Settings, BookOpen
} from 'lucide-react';
import api from '../services/api';

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'generation', name: 'Generation Quality', icon: Target },
    { id: 'documents', name: 'Document Usage', icon: FileText },
    { id: 'templates', name: 'Template Performance', icon: BookOpen },
    { id: 'optimization', name: 'Optimization', icon: Zap }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/analytics/generation-analytics', {
        params: { 
          days: parseInt(dateRange),
          includeOptimizations: true
        }
      });

      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatNumber = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num?.toFixed(0) || '0';
  };

  const formatPercentage = (num) => `${(num * 100).toFixed(1)}%`;

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Generation Analytics</h1>
          <p className="text-gray-600">Insights and optimization recommendations for your AI content generation</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab analytics={analytics} dateRange={dateRange} />
          )}
          
          {activeTab === 'generation' && (
            <GenerationQualityTab analytics={analytics} />
          )}
          
          {activeTab === 'documents' && (
            <DocumentUsageTab analytics={analytics} />
          )}
          
          {activeTab === 'templates' && (
            <TemplatePerformanceTab analytics={analytics} />
          )}
          
          {activeTab === 'optimization' && (
            <OptimizationTab analytics={analytics} />
          )}
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics, dateRange }) => {
  if (!analytics) return <div>No data available</div>;

  const stats = [
    {
      name: 'Total Generations',
      value: analytics.totalGenerations || 0,
      trend: analytics.trends?.generations || 0,
      icon: FileText,
      color: 'blue'
    },
    {
      name: 'Avg Quality Score',
      value: `${((analytics.avgQualityScore || 0) * 100).toFixed(1)}%`,
      trend: analytics.trends?.quality || 0,
      icon: Target,
      color: 'green'
    },
    {
      name: 'Documents Used',
      value: analytics.documentsUsed || 0,
      trend: analytics.trends?.documents || 0,
      icon: BookOpen,
      color: 'purple'
    },
    {
      name: 'Avg Generation Time',
      value: `${((analytics.avgGenerationTime || 0) / 1000).toFixed(1)}s`,
      trend: analytics.trends?.speed || 0,
      icon: Clock,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                <div className="flex items-center">
                  {getTrendIcon(stat.trend)}
                  <span className={`text-sm ml-1 ${getTrendColor(stat.trend)}`}>
                    {Math.abs(stat.trend).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-sm text-gray-600">{stat.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Generation Activity</h3>
        <UsageChart data={analytics.dailyUsage || []} />
      </div>

      {/* Template Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Template Usage</h3>
          <TemplateDistribution data={analytics.templateUsage || []} />
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Distribution</h3>
          <QualityDistribution data={analytics.qualityDistribution || []} />
        </div>
      </div>
    </div>
  );
};

// Generation Quality Tab Component
const GenerationQualityTab = ({ analytics }) => {
  if (!analytics?.qualityMetrics) return <div>No quality data available</div>;

  const { qualityMetrics } = analytics;

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Average Quality</h3>
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {((qualityMetrics.avgScore || 0) * 100).toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Across all generations
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">High Quality Rate</h3>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {((qualityMetrics.highQualityRate || 0) * 100).toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Scoring above 80%
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Improvement Trend</h3>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-purple-600">
            +{((qualityMetrics.improvementTrend || 0) * 100).toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Month over month
          </p>
        </div>
      </div>

      {/* Quality Factors */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Factors</h3>
        <QualityFactors data={qualityMetrics.factors || []} />
      </div>

      {/* Quality Issues */}
      {qualityMetrics.commonIssues && qualityMetrics.commonIssues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Common Quality Issues</h3>
          <div className="space-y-3">
            {qualityMetrics.commonIssues.map((issue, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">{issue.title}</h4>
                  <p className="text-sm text-amber-700">{issue.description}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Affects {issue.frequency}% of generations
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Document Usage Tab Component
const DocumentUsageTab = ({ analytics }) => {
  if (!analytics?.documentMetrics) return <div>No document data available</div>;

  const { documentMetrics } = analytics;

  return (
    <div className="space-y-6">
      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Total Documents</h3>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {documentMetrics.totalDocuments || 0}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Actively Used</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {documentMetrics.activeDocuments || 0}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Usage Rate</h3>
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {((documentMetrics.usageRate || 0) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Avg per Generation</h3>
            <Target className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(documentMetrics.avgPerGeneration || 0).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Most Used Documents */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Most Used Documents</h3>
        <MostUsedDocuments data={documentMetrics.mostUsed || []} />
      </div>

      {/* Document Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Usage by Category</h3>
          <CategoryUsage data={documentMetrics.categoryUsage || []} />
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Underutilized Documents</h3>
          <UnderutilizedDocuments data={documentMetrics.underutilized || []} />
        </div>
      </div>
    </div>
  );
};

// Template Performance Tab Component
const TemplatePerformanceTab = ({ analytics }) => {
  if (!analytics?.templateMetrics) return <div>No template data available</div>;

  const { templateMetrics } = analytics;

  return (
    <div className="space-y-6">
      {/* Template Comparison */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Template Performance Comparison</h3>
        <TemplateComparison data={templateMetrics.comparison || []} />
      </div>

      {/* Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templateMetrics.details && templateMetrics.details.map((template, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                template.trend > 0 ? 'bg-green-100 text-green-800' : 
                template.trend < 0 ? 'bg-red-100 text-red-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {template.trend > 0 ? '+' : ''}{(template.trend * 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Usage Count:</span>
                <span className="font-medium">{template.usageCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Quality:</span>
                <span className="font-medium">{(template.avgQuality * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Time:</span>
                <span className="font-medium">{(template.avgTime / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-medium">{(template.successRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Optimization Tab Component
const OptimizationTab = ({ analytics }) => {
  if (!analytics?.optimizations) return <div>No optimization data available</div>;

  const { optimizations } = analytics;

  return (
    <div className="space-y-6">
      {/* Optimization Score */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">System Optimization Score</h3>
            <p className="text-blue-700 mt-1">Overall efficiency and performance rating</p>
          </div>
          <div className="text-4xl font-bold text-blue-600">
            {(optimizations.score * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Optimization Recommendations</h3>
        <div className="space-y-4">
          {optimizations.recommendations?.map((rec, index) => (
            <OptimizationRecommendation key={index} recommendation={rec} />
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Speed Optimization</h3>
          <SpeedMetrics data={optimizations.speed || {}} />
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Optimization</h3>
          <QualityMetrics data={optimizations.quality || {}} />
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Usage</h3>
          <ResourceMetrics data={optimizations.resources || {}} />
        </div>
      </div>
    </div>
  );
};

// Helper Components
const getTrendIcon = (trend) => {
  if (trend > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
  if (trend < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const getTrendColor = (trend) => {
  if (trend > 0) return 'text-green-600';
  if (trend < 0) return 'text-red-600';
  return 'text-gray-600';
};

// Placeholder components for charts and visualizations
const UsageChart = ({ data }) => (
  <div className="h-64 flex items-center justify-center border border-gray-200 rounded">
    <p className="text-gray-500">Usage Chart Visualization</p>
  </div>
);

const TemplateDistribution = ({ data }) => (
  <div className="space-y-2">
    {data.map((item, index) => (
      <div key={index} className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{item.name}</span>
        <span className="text-sm font-medium">{item.count}</span>
      </div>
    ))}
  </div>
);

const QualityDistribution = ({ data }) => (
  <div className="h-32 flex items-center justify-center border border-gray-200 rounded">
    <p className="text-gray-500">Quality Distribution Chart</p>
  </div>
);

const QualityFactors = ({ data }) => (
  <div className="space-y-3">
    {data.map((factor, index) => (
      <div key={index} className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{factor.name}</span>
        <div className="flex items-center space-x-2">
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${factor.score * 100}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{(factor.score * 100).toFixed(0)}%</span>
        </div>
      </div>
    ))}
  </div>
);

const MostUsedDocuments = ({ data }) => (
  <div className="space-y-3">
    {data.map((doc, index) => (
      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
        <div className="flex items-center space-x-3">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium">{doc.name}</span>
        </div>
        <span className="text-sm text-gray-600">{doc.usageCount} uses</span>
      </div>
    ))}
  </div>
);

const CategoryUsage = ({ data }) => (
  <div className="space-y-2">
    {data.map((category, index) => (
      <div key={index} className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{category.name}</span>
        <span className="text-sm font-medium">{category.percentage}%</span>
      </div>
    ))}
  </div>
);

const UnderutilizedDocuments = ({ data }) => (
  <div className="space-y-3">
    {data.map((doc, index) => (
      <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm font-medium">{doc.name}</span>
        </div>
        <span className="text-sm text-yellow-600">Low usage</span>
      </div>
    ))}
  </div>
);

const TemplateComparison = ({ data }) => (
  <div className="h-64 flex items-center justify-center border border-gray-200 rounded">
    <p className="text-gray-500">Template Comparison Chart</p>
  </div>
);

const OptimizationRecommendation = ({ recommendation }) => (
  <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
    <div className={`p-2 rounded-lg ${
      recommendation.priority === 'high' ? 'bg-red-100' :
      recommendation.priority === 'medium' ? 'bg-yellow-100' :
      'bg-blue-100'
    }`}>
      <Zap className={`w-4 h-4 ${
        recommendation.priority === 'high' ? 'text-red-600' :
        recommendation.priority === 'medium' ? 'text-yellow-600' :
        'text-blue-600'
      }`} />
    </div>
    <div className="flex-1">
      <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
      <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500">Potential Impact: {recommendation.impact}</span>
        <span className={`px-2 py-1 text-xs font-medium rounded ${
          recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
          recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {recommendation.priority} priority
        </span>
      </div>
    </div>
  </div>
);

const SpeedMetrics = ({ data }) => (
  <div className="space-y-3">
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Avg Response Time:</span>
      <span className="text-sm font-medium">{data.avgTime || 0}ms</span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Cache Hit Rate:</span>
      <span className="text-sm font-medium">{(data.cacheHitRate || 0) * 100}%</span>
    </div>
  </div>
);

const QualityMetrics = ({ data }) => (
  <div className="space-y-3">
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Quality Score:</span>
      <span className="text-sm font-medium">{(data.score || 0) * 100}%</span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Consistency:</span>
      <span className="text-sm font-medium">{(data.consistency || 0) * 100}%</span>
    </div>
  </div>
);

const ResourceMetrics = ({ data }) => (
  <div className="space-y-3">
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Token Usage:</span>
      <span className="text-sm font-medium">{data.tokenUsage || 0}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Efficiency:</span>
      <span className="text-sm font-medium">{(data.efficiency || 0) * 100}%</span>
    </div>
  </div>
);

export default Analytics;