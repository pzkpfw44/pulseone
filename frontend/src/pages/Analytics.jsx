import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Target, Calendar, Filter,
  Download, RefreshCw, Eye, Settings, PieChart, LineChart
} from 'lucide-react';
import api from '../services/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('last_30_days');
  const [selectedModules, setSelectedModules] = useState(['pulse_360']);

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange, selectedModules]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/analytics/dashboard', {
        params: {
          timeRange: selectedTimeRange,
          modules: selectedModules.join(',')
        }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Mock data for development
      setDashboardData({
        overview: {
          totalUsers: 248,
          activeUsers: 189,
          completionRate: 87,
          avgRating: 4.2
        },
        trends: {
          participation: [85, 87, 82, 89, 91, 87, 85],
          satisfaction: [4.1, 4.2, 4.0, 4.3, 4.2, 4.1, 4.2]
        },
        modules: {
          pulse_360: { status: 'active', users: 189, lastSync: '2 min ago' },
          pulse_voice: { status: 'coming_soon', users: 0, lastSync: 'N/A' },
          pulse_learn: { status: 'coming_soon', users: 0, lastSync: 'N/A' },
          pulse_assess: { status: 'coming_soon', users: 0, lastSync: 'N/A' }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const timeRanges = [
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'last_year', label: 'Last year' }
  ];

  const availableModules = [
    { id: 'pulse_360', name: 'Pulse 360', status: 'active' },
    { id: 'pulse_voice', name: 'Pulse Voice', status: 'coming_soon' },
    { id: 'pulse_learn', name: 'Pulse Learn', status: 'coming_soon' },
    { id: 'pulse_assess', name: 'Pulse Assess', status: 'coming_soon' }
  ];

  const MetricCard = ({ title, value, trend, icon: Icon, color = "blue" }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+{trend}% vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Cross-module insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button 
            onClick={loadAnalytics}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modules</label>
              <div className="flex items-center space-x-2">
                {availableModules.map(module => (
                  <label key={module.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedModules([...selectedModules, module.id]);
                        } else {
                          setSelectedModules(selectedModules.filter(m => m !== module.id));
                        }
                      }}
                      disabled={module.status === 'coming_soon'}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className={`ml-2 text-sm ${module.status === 'coming_soon' ? 'text-gray-400' : 'text-gray-700'}`}>
                      {module.name}
                      {module.status === 'coming_soon' && ' (Coming Soon)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900">
            <Settings className="w-4 h-4 mr-2" />
            Customize
          </button>
        </div>
      </div>

      {/* Overview Metrics */}
      {!loading && dashboardData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={dashboardData.overview.totalUsers}
              trend={5}
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="Active Users"
              value={dashboardData.overview.activeUsers}
              trend={12}
              icon={Target}
              color="green"
            />
            <MetricCard
              title="Completion Rate"
              value={`${dashboardData.overview.completionRate}%`}
              trend={3}
              icon={BarChart3}
              color="purple"
            />
            <MetricCard
              title="Avg Rating"
              value={dashboardData.overview.avgRating}
              trend={2}
              icon={TrendingUp}
              color="orange"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Participation Trends */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Participation Trends</h3>
                <LineChart className="w-5 h-5 text-gray-400" />
              </div>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Chart visualization will be implemented here</p>
                  <p className="text-xs text-gray-400 mt-1">Showing participation over time</p>
                </div>
              </div>
            </div>

            {/* Module Status */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Module Status</h3>
                <PieChart className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {Object.entries(dashboardData.modules).map(([moduleId, data]) => {
                  const module = availableModules.find(m => m.id === moduleId);
                  return (
                    <div key={moduleId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          data.status === 'active' ? 'bg-green-400' : 'bg-gray-300'
                        }`}></div>
                        <span className="font-medium text-gray-900">{module?.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{data.users} users</p>
                        <p className="text-xs text-gray-500">Last sync: {data.lastSync}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Detailed Analytics</h3>
              <p className="text-sm text-gray-500 mt-1">Deep dive into your data</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Performance Metrics</h4>
                  <p className="text-sm text-gray-500 mt-1">Track KPIs across all modules</p>
                  <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details →
                  </button>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Trend Analysis</h4>
                  <p className="text-sm text-gray-500 mt-1">Identify patterns and insights</p>
                  <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details →
                  </button>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">User Behavior</h4>
                  <p className="text-sm text-gray-500 mt-1">Understand user engagement</p>
                  <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border p-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
            <p className="mt-2 text-gray-500">Loading analytics data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;