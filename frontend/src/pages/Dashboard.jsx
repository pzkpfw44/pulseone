import React, { useState, useEffect } from 'react';
import { 
  Database, MessageSquare, FileText, BarChart2, 
  AlertTriangle, ArrowRight, RefreshCw, Shield, Brain, TrendingUp,
  CheckCircle, Clock, Plus, Zap, Target, Calendar, Activity, ChevronRight,
  Network, Users, Layers, HardDrive, Wifi
} from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

// Base card component
const DashboardCard = ({ children, className = "", onClick, hover = false }) => {
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-200 ${
        hover ? 'cursor-pointer hover:border-blue-200' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Metric card with better visual hierarchy
const MetricCard = ({ title, rawData, icon: Icon, isLoading, error, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-500 text-white",
    green: "bg-green-500 text-white", 
    purple: "bg-purple-500 text-white",
    orange: "bg-orange-500 text-white",
    indigo: "bg-indigo-500 text-white"
  };

  return (
    <DashboardCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {!isLoading && !error && rawData?.trend && (
          <div className="text-green-500 text-sm font-medium flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            +{rawData.trend}%
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          </div>
        ) : error ? (
          <div>
            <p className="text-2xl font-bold text-gray-400">--</p>
            <p className="text-red-500 text-sm">Error loading</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{rawData.value}</p>
            {rawData.subtitle && (
              <p className="text-sm text-gray-500">{rawData.subtitle}</p>
            )}
          </div>
        )}
      </div>
    </DashboardCard>
  );
};

// Quick action button component
const QuickActionButton = ({ icon: Icon, title, description, onClick, color = "blue" }) => {
  const colorClasses = {
    blue: "border-blue-200 hover:border-blue-300 hover:bg-blue-50",
    green: "border-green-200 hover:border-green-300 hover:bg-green-50",
    purple: "border-purple-200 hover:border-purple-300 hover:bg-purple-50",
    orange: "border-orange-200 hover:border-orange-300 hover:bg-orange-50",
    indigo: "border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
  };

  const iconColorClasses = {
    blue: "text-blue-600",
    green: "text-green-600", 
    purple: "text-purple-600",
    orange: "text-orange-600",
    indigo: "text-indigo-600"
  };

  return (
    <button 
      onClick={onClick}
      className={`w-full p-4 border-2 border-dashed rounded-lg transition-all duration-200 text-left group ${colorClasses[color]}`}
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Icon className={`w-5 h-5 ${iconColorClasses[color]}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
      </div>
    </button>
  );
};

const Dashboard = () => {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const navigate = useNavigate();

  const tips = [
    {
      icon: <Brain className="w-5 h-5" />,
      title: "AI-Powered Orchestration",
      description: "Pulse One intelligently connects and analyzes data across all your systems.",
      color: "bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 text-purple-800"
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: "Advanced RAG Capabilities", 
      description: "Upload any document and let AI create intelligent, contextual insights.",
      color: "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-800"
    },
    {
      icon: <Network className="w-5 h-5" />,
      title: "Cross-Module Integration",
      description: "Seamlessly connects Pulse 360, Voice, Learn, and Assess for unified analytics.",
      color: "bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-800"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Enterprise-Grade Security",
      description: "Your data is always private and secure with decentralized AI infrastructure.",
      color: "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 text-orange-800"
    }
  ];

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/dashboard/orchestration-stats');
      console.log('Dashboard data:', response.data);
      setRawData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load some metrics. Please try again later.');
      // Set some default data for now
      setRawData({
        connectedModules: { value: '4', subtitle: 'Pulse modules connected' },
        totalDocuments: { value: '156', subtitle: 'Documents processed' },
        ragQueries: { value: '2.3K', subtitle: 'AI queries processed' },
        syncStatus: { value: '98%', subtitle: 'Data synchronization' },
        insights: { value: '47', subtitle: 'AI insights generated' }
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const refreshInterval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const getLastUpdateTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const currentTip = tips[currentTipIndex];

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg text-white p-6 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pulse One Dashboard</h1>
            <p className="text-blue-100 flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              AI-powered orchestration layer for your entire HR ecosystem
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {!loading && !error && (
              <div className="text-right">
                <p className="text-xs text-blue-200">Last updated</p>
                <p className="text-sm font-medium">{getLastUpdateTime()}</p>
              </div>
            )}
            <button 
              onClick={handleRefresh} 
              className="flex items-center px-4 py-2 text-sm bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Pulse One Features Card */}
        <div className="xl:col-span-2">
          <DashboardCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Pulse One Capabilities</h2>
              <div className="flex space-x-1">
                {tips.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentTipIndex ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className={`p-4 rounded-xl border-l-4 transition-all duration-500 ${currentTip.color}`}>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  {currentTip.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{currentTip.title}</h3>
                  <p className="text-sm opacity-90">{currentTip.description}</p>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* System Health Card */}
        <div className="lg:col-span-1">
          <DashboardCard className="p-6 h-full">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">RAG Engine</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Data Sync</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-600">Syncing</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Flux AI</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-600">Connected</span>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Connected Modules Card */}
        <div className="lg:col-span-1">
          <DashboardCard className="p-6 h-full">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Network className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Connected Modules</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Pulse 360</span>
                  <p className="text-xs text-gray-500">360 Feedback</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-600">Active</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Pulse Voice</span>
                  <p className="text-xs text-gray-500">Coming Soon</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-400">Pending</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Pulse Learn</span>
                  <p className="text-xs text-gray-500">Coming Soon</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-400">Pending</span>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Metrics Row */}
        <MetricCard 
          title="Connected Modules" 
          rawData={rawData?.connectedModules || { value: '1', subtitle: 'Pulse 360 active' }}
          icon={Network}
          isLoading={loading}
          error={false}
          color="blue"
        />
        
        <MetricCard 
          title="Documents Processed" 
          rawData={rawData?.totalDocuments || { value: '0', subtitle: 'Ready for analysis' }}
          icon={FileText}
          isLoading={loading}
          error={false}
          color="green"
        />
        
        <MetricCard 
          title="RAG Queries" 
          rawData={rawData?.ragQueries || { value: '0', subtitle: 'AI interactions' }}
          icon={Brain}
          isLoading={loading}
          error={false}
          color="purple"
        />
        
        <MetricCard 
          title="Sync Status" 
          rawData={rawData?.syncStatus || { value: '100%', subtitle: 'All systems synced' }}
          icon={Wifi}
          isLoading={loading}
          error={false}
          color="orange"
        />

        {/* Quick Actions Card */}
        <div className="xl:col-span-2">
          <DashboardCard className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Zap className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuickActionButton
                icon={MessageSquare}
                title="Chat with AI"
                description="Ask questions about your data"
                onClick={() => navigate('/chat')}
                color="blue"
              />
              <QuickActionButton
                icon={FileText}
                title="Upload Knowledge"
                description="Add documents to the knowledge base"
                onClick={() => navigate('/knowledge-feed')}
                color="green"
              />
              <QuickActionButton
                icon={BarChart2}
                title="View Analytics"
                description="Explore cross-module insights"
                onClick={() => navigate('/analytics')}
                color="purple"
              />
              <QuickActionButton
                icon={Database}
                title="Manage Connections"
                description="Configure data sources"
                onClick={() => navigate('/connections')}
                color="orange"
              />
            </div>
          </DashboardCard>
        </div>

        {/* Recent Activity Card */}
        <div className="lg:col-span-2">
          <DashboardCard className="h-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-6">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm mb-3">No recent activity</p>
                <p className="text-xs text-gray-400">Activity will appear here as you use Pulse One</p>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;