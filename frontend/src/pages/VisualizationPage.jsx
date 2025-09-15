import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TrieVisualization from '../components/TrieVisualization';

const VisualizationPage = () => {
  const location = useLocation();
  const [currentQuery, setCurrentQuery] = useState('');

  // Get query from URL params or state
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryParam = searchParams.get('query');
    if (queryParam) {
      setCurrentQuery(queryParam);
    }
  }, [location]);

  return (
    <div>
      <div className="mb-6 sm:mb-8 text-center">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Trie Data Structure Visualization
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto">
          Explore how the Trie (prefix tree) data structure organizes and searches through data efficiently.
        </p>
      </div>

      {/* Query Input for Visualization */}
      <div className="mb-6 max-w-md mx-auto">
        <label htmlFor="viz-query" className="block text-sm font-medium text-gray-700 mb-2">
          Enter a query to highlight the path in the Trie:
        </label>
        <input
          id="viz-query"
          type="text"
          value={currentQuery}
          onChange={(e) => setCurrentQuery(e.target.value)}
          placeholder="Type to see path highlighting..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Algorithm Information */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Time Complexity</h3>
          <div className="text-sm text-blue-800">
            <p><strong>Search:</strong> O(L) where L is query length</p>
            <p><strong>Insert:</strong> O(L) where L is word length</p>
            <p><strong>Space:</strong> O(ALPHABET_SIZE × N × M)</p>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Advantages</h3>
          <div className="text-sm text-green-800">
            <p>• Fast prefix-based searches</p>
            <p>• Memory efficient for common prefixes</p>
            <p>• Supports autocomplete naturally</p>
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">Use Cases</h3>
          <div className="text-sm text-purple-800">
            <p>• Search engines</p>
            <p>• Autocomplete systems</p>
            <p>• Dictionary implementations</p>
          </div>
        </div>
      </div>

      {/* Visualization Component */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <TrieVisualization currentQuery={currentQuery} />
      </div>

      {/* Educational Content */}
      <div className="mt-8 bg-gray-50 p-4 sm:p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">1. Tree Structure</h4>
            <p>
              Each node represents a character, and paths from root to leaf nodes form complete words.
              This allows efficient prefix matching.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">2. Search Process</h4>
            <p>
              Starting from the root, we follow edges labeled with query characters.
              All words in the subtree share the same prefix.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">3. Frequency Ranking</h4>
            <p>
              Each end-of-word node stores a frequency counter, allowing us to rank
              suggestions by popularity or usage.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">4. Memory Optimization</h4>
            <p>
              Common prefixes are stored only once, making the structure memory-efficient
              for large dictionaries with shared prefixes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationPage;