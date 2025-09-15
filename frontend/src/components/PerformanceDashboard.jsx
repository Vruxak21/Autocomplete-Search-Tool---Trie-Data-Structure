/**
 * Performance Metrics Dashboard Component
 * Displays real-time performance metrics and system health
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/apiClient';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { LoadingButton } from './LoadingSpinner';
import { PerformanceSkeleton } from './SkeletonLoader';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const { handleError } = useErrorHandler();

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await api.getPerformanceMetrics();
      setMetrics(response);
      setError(null);
    } catch (err) {
      const errorDetails = handleError(err, { 
        showToast: false,
        customMessage: 'Failed to fetch performance metrics'
      });
      setError(errorDetails.message);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (value, thresholds) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const MetricCard = ({ title, value, unit, status, description, children }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {status && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === 'good' ? 'bg-green-100 text-green-800' :
            status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {status.toUpperCase()}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {value} {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {description && <p className="text-sm text-gray-600 mb-3">{description}</p>}
      {children}
    </div>
  );

  const ResponseTimeChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    const maxTime = Math.max(...data.map(d => d.responseTime));
    const avgTime = data.reduce((sum, d) => sum + d.responseTime, 0) / data.length;

    return (
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Recent Response Times</span>
          <span>Avg: {formatDuration(avgTime)}</span>
        </div>
        <div className="flex items-end space-x-1 h-16">
          {data.slice(-20).map((point, index) => (
            <div
              key={index}
              className={`flex-1 rounded-t ${
                point.responseTime > 100 ? 'bg-red-400' :
                point.responseTime > 50 ? 'bg-yellow-400' :
                'bg-green-400'
              }`}
              style={{
                height: `${(point.responseTime / maxTime) * 100}%`,
                minHeight: '2px'
              }}
              title={`${formatDuration(point.responseTime)} - ${point.endpoint}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const MemoryChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    const maxMemory = Math.max(...data.map(d => d.process.heapUsed));

    return (
      <div className="mt-4">
        <div className="text-sm text-gray-600 mb-2">Memory Usage Trend</div>
        <div className="flex items-end space-x-1 h-16">
          {data.slice(-20).map((point, index) => (
            <div
              key={index}
              className="flex-1 bg-blue-400 rounded-t"
              style={{
                height: `${(point.process.heapUsed / maxMemory) * 100}%`,
                minHeight: '2px'
              }}
              title={`${formatBytes(point.process.heapUsed)} at ${new Date(point.timestamp).toLocaleTimeString()}`}
            />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <PerformanceSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-400 mr-3">⚠️</div>
          <div>
            <h3 className="text-lg font-medium text-red-800">Error Loading Metrics</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <LoadingButton
              onClick={fetchMetrics}
              loading={loading}
              className="mt-3 bg-red-600 text-white hover:bg-red-700"
            >
              Retry
            </LoadingButton>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const { requests, memory, trie, system } = metrics;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time system metrics and performance monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Auto-refresh</span>
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              disabled={!autoRefresh}
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
            <LoadingButton
              onClick={fetchMetrics}
              loading={loading}
              className="bg-blue-600 text-white hover:bg-blue-700 text-sm"
            >
              Refresh Now
            </LoadingButton>
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Requests"
            value={requests.total.toLocaleString()}
            status={requests.total > 1000 ? 'good' : 'warning'}
            description="Total API requests processed"
          />
          <MetricCard
            title="Memory Usage"
            value={formatBytes(memory.current.heapUsed)}
            status={memory.current.heapUsed < 100 * 1024 * 1024 ? 'good' : 'warning'}
            description="Current heap memory usage"
          />
          <MetricCard
            title="Response Time P95"
            value={formatDuration(requests.responseTimePercentiles?.p95 || 0)}
            status={
              !requests.responseTimePercentiles?.p95 ? 'good' :
              requests.responseTimePercentiles.p95 < 100 ? 'good' :
              requests.responseTimePercentiles.p95 < 500 ? 'warning' : 'error'
            }
            description="95th percentile response time"
          />
          <MetricCard
            title="System Load"
            value={system.cpus}
            unit="cores"
            description={`${system.platform} ${system.arch}`}
          />
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Request Metrics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Request Performance</h2>
            
            {/* Response Time Percentiles */}
            {requests.responseTimePercentiles && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Response Time Percentiles</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDuration(requests.responseTimePercentiles.p50)}
                    </div>
                    <div className="text-sm text-gray-600">P50 (Median)</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDuration(requests.responseTimePercentiles.p90)}
                    </div>
                    <div className="text-sm text-gray-600">P90</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDuration(requests.responseTimePercentiles.p95)}
                    </div>
                    <div className="text-sm text-gray-600">P95</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDuration(requests.responseTimePercentiles.p99)}
                    </div>
                    <div className="text-sm text-gray-600">P99</div>
                  </div>
                </div>
              </div>
            )}

            {/* Response Time Chart */}
            <ResponseTimeChart data={requests.recentRequests} />

            {/* Status Code Distribution */}
            {requests.statusCodes && Object.keys(requests.statusCodes).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Status Code Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(requests.statusCodes).map(([code, count]) => (
                    <div key={code} className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        code.startsWith('2') ? 'bg-green-100 text-green-800' :
                        code.startsWith('4') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {code}
                      </span>
                      <span className="text-gray-600">{count} requests</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Memory Metrics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Memory Performance</h2>
            
            {/* Current Memory Usage */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Current Usage</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Heap Used</span>
                  <span className="font-medium">{formatBytes(memory.current.heapUsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Heap Total</span>
                  <span className="font-medium">{formatBytes(memory.current.heapTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RSS</span>
                  <span className="font-medium">{formatBytes(memory.current.rss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">External</span>
                  <span className="font-medium">{formatBytes(memory.current.external)}</span>
                </div>
              </div>
            </div>

            {/* Memory Trend */}
            <MemoryChart data={memory.samples} />

            {/* Memory Trend Info */}
            {memory.trend && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Trend</span>
                  <span className={`font-medium ${
                    memory.trend.trend === 'increasing' ? 'text-red-600' :
                    memory.trend.trend === 'decreasing' ? 'text-green-600' :
                    'text-gray-600'
                  }`}>
                    {memory.trend.trend} ({memory.trend.changePercent}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trie Performance */}
        {trie && trie.recentOperations && trie.recentOperations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Trie Performance</h2>
            
            {/* Operation Statistics */}
            {trie.operationStats && Object.keys(trie.operationStats).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Operation Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(trie.operationStats).map(([operation, stats]) => (
                    <div key={operation} className="p-4 bg-gray-50 rounded">
                      <div className="text-lg font-semibold text-gray-800 capitalize">{operation}</div>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Count</span>
                          <span>{stats.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Time</span>
                          <span>{formatDuration(stats.avgTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Max Time</span>
                          <span className={stats.maxTime > 50 ? 'text-red-600' : 'text-gray-900'}>
                            {formatDuration(stats.maxTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Operations */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Recent Operations</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Operation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trie.recentOperations.slice(-10).map((op, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                          {op.operation}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          op.duration > 50 ? 'text-red-600 font-medium' : 'text-gray-900'
                        }`}>
                          {formatDuration(op.duration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(op.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Endpoint Performance */}
        {requests.endpoints && Object.keys(requests.endpoints).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Endpoint Performance</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Errors
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(requests.endpoints).map(([endpoint, stats]) => (
                    <tr key={endpoint}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {endpoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats.count}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        stats.avgTime > 100 ? 'text-red-600 font-medium' : 'text-gray-900'
                      }`}>
                        {formatDuration(stats.avgTime)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        stats.maxTime > 200 ? 'text-red-600 font-medium' : 'text-gray-900'
                      }`}>
                        {formatDuration(stats.maxTime)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        stats.errors > 0 ? 'text-red-600 font-medium' : 'text-gray-900'
                      }`}>
                        {stats.errors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;