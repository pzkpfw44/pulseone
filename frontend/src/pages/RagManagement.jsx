import React, { useState, useEffect } from 'react';
import { 
  Brain, Database, Search, Settings, RefreshCw, Gauge,
  FileText, Zap, TrendingUp, AlertTriangle, CheckCircle,
  Clock, BarChart3, Layers, Target, Activity, HardDrive,
  Cpu, Memory, Monitor
} from 'lucide-react';
import api from '../services/api';

const RagManagement = () => {
  const [ragStats, setRagStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    loadRagStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadRagStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRagStats = async () => {
    try {
      const response = await api.get('/rag/stats');
      setRagStats(response.data);
    } catch (error) {
      console.error('Error loading RAG stats:', error);
      // Mock data for development
      setRagStats({
        overview: {
          totalDocuments: 156,
          processedDocuments: 142,
          totalChunks: 3847,
          indexedChunks: 3642,
          vectorDimensions: 1536,
          storageUsed: '2.4 GB'
        },
        performance: {
          avgQueryTime: '234ms',
          avgRelevanceScore: 0.87,
          queryThroughput: '45 queries/min',
          cacheHitRate: '76%',
          successRate: '98.2%'
        },
        processing: {
          documentsInQueue: 14,
          chunksProcessing: 205,
          embeddingsGenerating: 89,
          indexingStatus: 'active'
        },
        health: {
          vectorDbStatus: 'healthy',
          embeddingServiceStatus: 'healthy',
          searchEngineStatus: 'healthy',
          lastHealthCheck: new Date('2024-12-15T10:45:00')
        },
        recentQueries: [
          { query: 'leadership development best practices', relevance: 0.92, responseTime: '187ms', timestamp: new Date('2024-12-15T10:43:00') },
          { query: 'employee performance review templates', relevance: 0.89, responseTime: '203ms', timestamp: new Date('2024-12-15T10:41:00') },
          { query: 'company values implementation', relevance: 0.84, responseTime: '156ms', timestamp: new Date('2024-12-15T10:38:00') }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await api.post('/rag/reindex');
      // Reload stats after reindexing
      setTimeout(loadRagStats, 2000);
    } catch (error) {
      console.error('Reindexing failed:', error);
    } finally {
      setReindexing(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      await api.post('/rag/optimize');
      setTimeout(loadRagStats, 2000);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const getHealthStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RAG Management</h1>
          <p className="text-gray-600">Monitor and optimize document processing, embeddings, and search performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {optimizing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Optimize Index
          </button>
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {reindexing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Reindex All
          </button>
          <button 
            onClick={loadRagStats}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">System Health</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time status of RAG components</p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
              <p className="mt-2 text-gray-500">Loading system status...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {getHealthStatusIcon(ragStats.health.vectorDbStatus)}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHealthStatusColor(ragStats.health.vectorDbStatus)}`}>
                    Vector Database
                  </span>
                </div>
                <p className="text-sm text-gray-600">Storing {ragStats.overview.indexedChunks.toLocaleString()} embeddings</p>
              </div>
              <div className="text-center">
                <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {getHealthStatusIcon(ragStats.health.embeddingServiceStatus)}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHealthStatusColor(ragStats.health.embeddingServiceStatus)}`}>
                    Embedding Service
                  </span>
                </div>
                <p className="text-sm text-gray-600">{ragStats.overview.vectorDimensions}D vectors</p>
              </div>
              <div className="text-center">
                <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-3">
                  <Search className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {getHealthStatusIcon(ragStats.health.searchEngineStatus)}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHealthStatusColor(ragStats.health.searchEngineStatus)}`}>
                    Search Engine
                  </span>
                </div>
                <p className="text-sm text-gray-600">Avg relevance: {(ragStats.performance.avgRelevanceScore * 100).toFixed(1)}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      {!loading && ragStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Processed Documents</p>
                  <p className="text-2xl font-semibold text-gray-900">{ragStats.overview.processedDocuments}</p>
                  <p className="text-xs text-gray-500">of {ragStats.overview.totalDocuments} total</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Layers className="w-5 h-5 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Indexed Chunks</p>
                  <p className="text-2xl font-semibold text-gray-900">{ragStats.overview.indexedChunks.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">of {ragStats.overview.totalChunks.toLocaleString()} total</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Gauge className="w-5 h-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Query Performance</p>
                  <p className="text-2xl font-semibold text-gray-900">{ragStats.performance.avgQueryTime}</p>
                  <p className="text-xs text-gray-500">avg response time</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <HardDrive className="w-5 h-5 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Storage Used</p>
                  <p className="text-2xl font-semibold text-gray-900">{ragStats.overview.storageUsed}</p>
                  <p className="text-xs text-gray-500">vector storage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Queue and Performance Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Processing Queue */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Processing Queue</h2>
                <p className="text-sm text-gray-500 mt-1">Current document processing status</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">Documents in Queue</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">{ragStats.processing.documentsInQueue}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Cpu className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-900">Chunks Processing</span>
                    </div>
                    <span className="text-lg font-semibold text-purple-600">{ragStats.processing.chunksProcessing}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Brain className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900">Embeddings Generating</span>
                    </div>
                    <span className="text-lg font-semibold text-green-600">{ragStats.processing.embeddingsGenerating}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Indexing Status</span>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ragStats.processing.indexingStatus === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ragStats.processing.indexingStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Performance Metrics</h2>
                <p className="text-sm text-gray-500 mt-1">Query and retrieval performance</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Average Query Time</span>
                    <span className="text-sm text-gray-900">{ragStats.performance.avgQueryTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Relevance Score</span>
                    <span className="text-sm text-gray-900">{(ragStats.performance.avgRelevanceScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Query Throughput</span>
                    <span className="text-sm text-gray-900">{ragStats.performance.queryThroughput}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Cache Hit Rate</span>
                    <span className="text-sm text-gray-900">{ragStats.performance.cacheHitRate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Success Rate</span>
                    <span className="text-sm text-gray-900">{ragStats.performance.successRate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Queries */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Queries</h2>
              <p className="text-sm text-gray-500 mt-1">Latest search queries and their performance</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Query
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Relevance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ragStats.recentQueries.map((query, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{query.query}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-gray-900">{(query.relevance * 100).toFixed(1)}%</div>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${query.relevance * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {query.responseTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(query.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RAG Configuration Tips */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-purple-900 mb-2">RAG Optimization Tips</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Regularly reindex documents to improve search relevance</li>
                  <li>• Monitor chunk size and overlap for optimal retrieval performance</li>
                  <li>• Use cache optimization to reduce query response times</li>
                  <li>• Review embedding quality and consider model updates</li>
                  <li>• Analyze query patterns to optimize indexing strategies</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RagManagement;