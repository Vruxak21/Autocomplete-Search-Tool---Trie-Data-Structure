import PerformanceDashboard from '../components/PerformanceDashboard';

const PerformancePage = () => {
  return (
    <div>
      <div className="mb-6 sm:mb-8 text-center">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Performance Monitoring
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto">
          Monitor system performance, response times, and resource usage in real-time.
        </p>
      </div>

      {/* Performance Overview Cards */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
              <p className="text-lg font-semibold text-gray-900">&lt;100ms</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Memory Usage</p>
              <p className="text-lg font-semibold text-gray-900">Optimized</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Concurrent Users</p>
              <p className="text-lg font-semibold text-gray-900">100+</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Dataset Size</p>
              <p className="text-lg font-semibold text-gray-900">10K+ entries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Dashboard Component */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <PerformanceDashboard />
      </div>

      {/* Performance Tips */}
      <div className="mt-8 bg-blue-50 p-4 sm:p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Performance Optimization Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Frontend Optimizations</h4>
            <ul className="space-y-1">
              <li>• Debounced search requests (300ms)</li>
              <li>• Virtual scrolling for large result sets</li>
              <li>• Memoized components to prevent re-renders</li>
              <li>• Lazy loading of visualization components</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Backend Optimizations</h4>
            <ul className="space-y-1">
              <li>• In-memory Trie for O(L) search complexity</li>
              <li>• Heap-based ranking for top-K results</li>
              <li>• Connection pooling for database operations</li>
              <li>• Compressed Trie nodes for memory efficiency</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;