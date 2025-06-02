import React, { useState, useEffect } from 'react';
import { 
  Database, Wifi, WifiOff, Settings, Plus, RefreshCw, 
  CheckCircle, AlertTriangle, Clock, Key, Server, 
  Cloud, Link, Unlink, Eye, EyeOff, TestTube
} from 'lucide-react';
import api from '../services/api';

const DataConnections = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingConnection, setTestingConnection] = useState(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const response = await api.get('/connections');
      setConnections(response.data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
      // Mock data for development
      setConnections([
        {
          id: 1,
          name: 'Pulse 360',
          type: 'pulse_module',
          status: 'connected',
          lastSync: new Date('2024-12-15T10:30:00'),
          config: {
            endpoint: 'http://localhost:5000',
            version: '1.0.0'
          },
          metrics: {
            recordsSync: 1247,
            lastSyncDuration: '2.3s',
            syncFrequency: 'real-time'
          },
          health: {
            uptime: '99.8%',
            responseTime: '45ms',
            errorRate: '0.1%'
          }
        },
        {
          id: 2,
          name: 'Pulse Voice',
          type: 'pulse_module',
          status: 'coming_soon',
          lastSync: null,
          config: {
            endpoint: null,
            version: null
          },
          metrics: {
            recordsSync: 0,
            lastSyncDuration: null,
            syncFrequency: null
          },
          health: {
            uptime: null,
            responseTime: null,
            errorRate: null
          }
        },
        {
          id: 3,
          name: 'SAP SuccessFactors',
          type: 'hris',
          status: 'disconnected',
          lastSync: new Date('2024-12-10T08:15:00'),
          config: {
            endpoint: 'https://api.successfactors.com',
            version: '2.0'
          },
          metrics: {
            recordsSync: 0,
            lastSyncDuration: null,
            syncFrequency: 'daily'
          },
          health: {
            uptime: '0%',
            responseTime: null,
            errorRate: null
          }
        },
        {
          id: 4,
          name: 'Microsoft Teams',
          type: 'collaboration',
          status: 'error',
          lastSync: new Date('2024-12-14T15:20:00'),
          config: {
            endpoint: 'https://graph.microsoft.com',
            version: '1.0'
          },
          metrics: {
            recordsSync: 234,
            lastSyncDuration: null,
            syncFrequency: 'hourly'
          },
          health: {
            uptime: '87.3%',
            responseTime: '156ms',
            errorRate: '12.4%'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const connectionTypes = [
    {
      id: 'pulse_module',
      name: 'Pulse Modules',
      icon: Database,
      color: 'bg-blue-500',
      description: 'Pulse 360, Voice, Learn, and Assess modules'
    },
    {
      id: 'hris',
      name: 'HRIS Systems',
      icon: Server,
      color: 'bg-green-500',
      description: 'Workday, SuccessFactors, BambooHR, etc.'
    },
    {
      id: 'hcm',
      name: 'HCM Platforms',
      icon: Cloud,
      color: 'bg-purple-500',
      description: 'Oracle HCM, SAP, ADP, etc.'
    },
    {
      id: 'collaboration',
      name: 'Collaboration Tools',
      icon: Link,
      color: 'bg-orange-500',
      description: 'Slack, Teams, Google Workspace'
    },
    {
      id: 'data_warehouse',
      name: 'Data Warehouses',
      icon: Database,
      color: 'bg-indigo-500',
      description: 'Snowflake, BigQuery, Redshift'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <Wifi className="w-4 h-4 text-green-500" />;
      case 'disconnected': return <WifiOff className="w-4 h-4 text-gray-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'coming_soon': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'coming_soon': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const testConnection = async (connectionId) => {
    setTestingConnection(connectionId);
    try {
      await api.post(`/connections/${connectionId}/test`);
      // Reload connections to get updated status
      await loadConnections();
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  const toggleConnection = async (connectionId, currentStatus) => {
    try {
      if (currentStatus === 'connected') {
        await api.post(`/connections/${connectionId}/disconnect`);
      } else {
        await api.post(`/connections/${connectionId}/connect`);
      }
      await loadConnections();
    } catch (error) {
      console.error('Failed to toggle connection:', error);
    }
  };

  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const errorCount = connections.filter(c => c.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Connections</h1>
          <p className="text-gray-600">Manage integrations with Pulse modules and external systems</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Connection
          </button>
          <button 
            onClick={loadConnections}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Connections</p>
              <p className="text-2xl font-semibold text-gray-900">{connections.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Connected</p>
              <p className="text-2xl font-semibold text-gray-900">{connectedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Errors</p>
              <p className="text-2xl font-semibold text-gray-900">{errorCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wifi className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-semibold text-gray-900">
                {connectedCount > 0 ? '99.2%' : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Types */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Available Connection Types</h2>
          <p className="text-sm text-gray-500 mt-1">Connect to various data sources and systems</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectionTypes.map((type) => {
              const IconComponent = type.icon;
              const typeConnections = connections.filter(c => c.type === type.id);
              return (
                <div key={type.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${type.color} text-white`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{type.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          {typeConnections.length} connection{typeConnections.length !== 1 ? 's' : ''}
                        </span>
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Configure →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Connections List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Active Connections</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
            <p className="mt-2 text-gray-500">Loading connections...</p>
          </div>
        ) : connections.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No connections configured</h3>
            <p className="mt-1 text-sm text-gray-500">Add your first data connection to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {connections.map((connection) => (
              <div key={connection.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Database className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{connection.name}</h3>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(connection.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(connection.status)}`}>
                            {connection.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {connection.config.endpoint && (
                        <p className="text-sm text-gray-500 mb-3">{connection.config.endpoint}</p>
                      )}
                      
                      {/* Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        {connection.metrics.recordsSync > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700">Records Synced</p>
                            <p className="text-sm text-gray-900">{connection.metrics.recordsSync.toLocaleString()}</p>
                          </div>
                        )}
                        {connection.metrics.syncFrequency && (
                          <div>
                            <p className="text-xs font-medium text-gray-700">Sync Frequency</p>
                            <p className="text-sm text-gray-900">{connection.metrics.syncFrequency}</p>
                          </div>
                        )}
                        {connection.health.uptime && (
                          <div>
                            <p className="text-xs font-medium text-gray-700">Uptime</p>
                            <p className="text-sm text-gray-900">{connection.health.uptime}</p>
                          </div>
                        )}
                        {connection.health.responseTime && (
                          <div>
                            <p className="text-xs font-medium text-gray-700">Response Time</p>
                            <p className="text-sm text-gray-900">{connection.health.responseTime}</p>
                          </div>
                        )}
                      </div>
                      
                      {connection.lastSync && (
                        <p className="text-xs text-gray-500">
                          Last sync: {new Date(connection.lastSync).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {connection.status !== 'coming_soon' && (
                      <>
                        <button
                          onClick={() => testConnection(connection.id)}
                          disabled={testingConnection === connection.id}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                          title="Test Connection"
                        >
                          {testingConnection === connection.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <TestTube className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleConnection(connection.id, connection.status)}
                          className={`p-2 rounded-lg ${
                            connection.status === 'connected'
                              ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-green-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={connection.status === 'connected' ? 'Disconnect' : 'Connect'}
                        >
                          {connection.status === 'connected' ? (
                            <Unlink className="w-4 h-4" />
                          ) : (
                            <Link className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                    <button 
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title="Configure"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add New Connection</h3>
              <p className="text-sm text-gray-500 mt-1">Configure a new data source connection</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connectionTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${type.color} text-white`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{type.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataConnections;