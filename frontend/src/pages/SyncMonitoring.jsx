// frontend/src/pages/SyncMonitoring.jsx

import React, { useState, useEffect } from 'react';
import { 
  Activity, RefreshCw, CheckCircle, AlertTriangle, Clock, 
  Database, Wifi, Settings, Monitor, Play, Pause, BarChart3
} from 'lucide-react';

const SyncMonitoring = () => {
  const [loading, setLoading] = useState(true);
  const [syncJobs, setSyncJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSyncData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSyncData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSyncData = async () => {
    try {
      // Mock data for now
      setSyncJobs([
        {
          id: 1,
          name: 'Pulse 360 Data Sync',
          source: 'Pulse 360',
          destination: 'Pulse One RAG',
          status: 'running',
          progress: 75,
          lastRun: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          nextRun: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes from now
          frequency: 'Every 30 minutes',
          recordsProcessed: 1247,
          totalRecords: 1500,
          duration: '2m 34s',
          errors: 0
        },
        {
          id: 2,
          name: 'Document Processing',
          source: 'Knowledge Feed',
          destination: 'Vector Database',
          status: 'completed',
          progress: 100,
          lastRun: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          nextRun: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
          frequency: 'Hourly',
          recordsProcessed: 12,
          totalRecords: 12,
          duration: '45s',
          errors: 0
        },
        {
          id: 3,
          name: 'Analytics Aggregation',
          source: 'Multiple Sources',
          destination: 'Analytics DB',
          status: 'failed',
          progress: 30,
          lastRun: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          nextRun: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          frequency: 'Every 2 hours',
          recordsProcessed: 89,
          totalRecords: 300,
          duration: '1m 12s',
          errors: 3
        }
      ]);
    } catch (error) {
      console.error('[PULSE-ONE] Error loading sync data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSyncData();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (status) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const formatTimeUntil = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((date - now) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Starting soon';
    if (diffInMinutes < 60) return `In ${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `In ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `In ${diffInDays}d`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Monitoring</h1>
          <p className="text-gray-600">Monitor data synchronization across all connected systems</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </button>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 bg-charcoal-600 text-white rounded-lg hover:bg-charcoal-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Syncs</p>
              <p className="text-2xl font-semibold text-gray-900">
                {syncJobs.filter(job => job.status === 'running').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-semibold text-gray-900">
                {syncJobs.filter(job => job.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed Syncs</p>
              <p className="text-2xl font-semibold text-gray-900">
                {syncJobs.filter(job => job.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Records Synced</p>
              <p className="text-2xl font-semibold text-gray-900">
                {syncJobs.reduce((sum, job) => sum + job.recordsProcessed, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Jobs List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Synchronization Jobs</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time status of all data synchronization processes</p>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
            <p className="mt-2 text-gray-500">Loading synchronization data...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {syncJobs.map((job) => (
              <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Database className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{job.name}</h3>
                      <p className="text-sm text-gray-500">{job.source} → {job.destination}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{job.recordsProcessed.toLocaleString()} / {job.totalRecords.toLocaleString()} records</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(job.status)}`}
                      style={{ width: `${job.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Job Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Frequency</p>
                    <p className="text-gray-600">{job.frequency}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Last Run</p>
                    <p className="text-gray-600">{formatTimeAgo(job.lastRun)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Next Run</p>
                    <p className="text-gray-600">{formatTimeUntil(job.nextRun)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Duration</p>
                    <p className="text-gray-600">{job.duration}</p>
                  </div>
                </div>

                {/* Error indicator */}
                {job.errors > 0 && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                      <span className="text-sm text-red-800">
                        {job.errors} error{job.errors > 1 ? 's' : ''} encountered during last sync
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">System Health</h2>
          <p className="text-sm text-gray-500 mt-1">Overall health of the synchronization infrastructure</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-3">
                <Wifi className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Network Connectivity</h3>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-green-600">Excellent</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">99.9% uptime</p>
            </div>
            
            <div className="text-center">
              <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Database Performance</h3>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-blue-600">Good</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Avg 45ms response</p>
            </div>
            
            <div className="text-center">
              <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
                <Monitor className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Resource Usage</h3>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-sm text-purple-600">Normal</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">68% CPU, 45% RAM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncMonitoring;