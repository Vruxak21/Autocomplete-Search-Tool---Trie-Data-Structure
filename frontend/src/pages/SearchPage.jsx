import { useState } from 'react';
import SearchInput from '../components/SearchInput';

const SearchPage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [currentQuery, setCurrentQuery] = useState('');

  return (
    <div className="text-center">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Search Interface
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          Start typing to see real-time autocomplete suggestions powered by a Trie data structure.
        </p>
      </div>
      
      <div className="mx-auto max-w-2xl">
        <SearchInput
          onSearch={(query, suggestions) => {
            setSearchResults(suggestions);
            setCurrentQuery(query);
          }}
          onSelect={(suggestion) => {
            console.log('Selected:', suggestion);
            setCurrentQuery(suggestion.word || suggestion);
          }}
          className="mb-6"
        />
        
        {/* Search Statistics */}
        {searchResults.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Search Results
            </h3>
            <p className="text-sm text-blue-700">
              Found {searchResults.length} suggestions for "{currentQuery}"
            </p>
          </div>
        )}
        
        {/* Feature Overview */}
        <div className="mt-8 text-left">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Features Implemented:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Real-time search with 300ms debounce</li>
                <li>✅ Sub-100ms response times</li>
                <li>✅ Memory-optimized Trie structure</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-medium text-gray-900 mb-2">User Experience</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Keyboard navigation (↑↓ arrows, Enter, Escape)</li>
                <li>✅ Loading states and error handling</li>
                <li>✅ Responsive design with Tailwind CSS</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-medium text-gray-900 mb-2">Accessibility</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ ARIA attributes for screen readers</li>
                <li>✅ Keyboard-only navigation support</li>
                <li>✅ High contrast design</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-medium text-gray-900 mb-2">Data Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Frequency tracking and ranking</li>
                <li>✅ Prefix highlighting</li>
                <li>✅ Multiple dataset support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;