import { useState, useCallback, useEffect, useRef } from 'react';
import { debounce } from 'lodash';
import SuggestionsDropdown from './SuggestionsDropdown';
import LoadingSpinner from './LoadingSpinner';
import { api } from '../utils/apiClient';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useToast } from './ToastContainer';

const SearchInput = ({ onSearch, onSelect, className = '' }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typoToleranceEnabled, setTypoToleranceEnabled] = useState(false);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const { handleError } = useErrorHandler();
  const { showSuccess } = useToast();

  // Debounced search function with 300ms delay
  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.search(searchQuery, { 
          limit: 5,
          typoTolerance: typoToleranceEnabled
        });

        setSuggestions(response.suggestions || []);
        setShowSuggestions(true);
        setSelectedIndex(-1);
        
        // Call onSearch callback if provided
        if (onSearch) {
          onSearch(searchQuery, response.suggestions);
        }
      } catch (err) {
        const errorDetails = handleError(err, { 
          showToast: false, // We'll show inline error instead
          customMessage: 'Failed to fetch suggestions'
        });
        setError(errorDetails.message);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [onSearch, typoToleranceEnabled, handleError]
  );

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      
      default:
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setQuery(suggestion.word);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    // Call onSelect callback if provided
    if (onSelect) {
      onSelect(suggestion);
    }

    // Increment frequency on backend
    incrementFrequency(suggestion.word);
  };

  // Increment frequency for selected suggestion
  const incrementFrequency = async (word) => {
    try {
      await api.incrementFrequency(word);
      showSuccess(`Selected "${word}"`, 2000);
    } catch (err) {
      // Don't show error to user for this background operation
      console.error('Failed to increment frequency:', err);
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Typo Tolerance Toggle */}
      <div className="mb-4 flex items-center justify-center">
        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={typoToleranceEnabled}
            onChange={(e) => setTypoToleranceEnabled(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Enable typo tolerance (fuzzy matching)</span>
        </label>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder="Start typing to see suggestions..."
          className={`w-full rounded-lg border-2 px-4 py-3 pr-12 text-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            error 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-300 focus:border-blue-500'
          }`}
          aria-label="Search input"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
        />
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" color="blue" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p>{error}</p>
            </div>
            <div className="ml-3">
              <button
                onClick={() => {
                  setError(null);
                  if (query) {
                    debouncedSearch(query);
                  }
                }}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      <SuggestionsDropdown
        ref={suggestionsRef}
        suggestions={suggestions}
        query={query}
        selectedIndex={selectedIndex}
        onSelect={handleSuggestionSelect}
        isVisible={showSuggestions && suggestions.length > 0}
      />

      {/* No Results Message */}
      {showSuggestions && suggestions.length === 0 && query.length > 0 && !isLoading && !error && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500 shadow-lg">
          No suggestions found for "{query}"
        </div>
      )}
    </div>
  );
};



export default SearchInput;