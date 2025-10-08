/**
 * @fileoverview ListView component for displaying suggestions in a flat list format
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * ListView component that renders suggestions as a flat list
 */
const ListView = ({
  suggestions = [],
  query = '',
  selectedIndex = -1,
  onSelect,
  className = ''
}) => {
  // Helper function to highlight matching text
  const highlightMatch = (text, searchQuery) => {
    if (!searchQuery) return text;
    
    const index = text.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <span className="bg-yellow-200 font-semibold">
          {text.substring(index, index + searchQuery.length)}
        </span>
        {text.substring(index + searchQuery.length)}
      </>
    );
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className={`list-view-empty ${className}`}>
        <div className="text-center text-gray-500 py-8">
          No suggestions found
        </div>
      </div>
    );
  }

  return (
    <div
      className={`list-view ${className}`}
      role="listbox"
      aria-label="Search suggestions list"
      data-testid="list-view"
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.word}-${index}`}
          className={`cursor-pointer border-b border-gray-100 px-4 py-3 transition-colors duration-150 last:border-b-0 ${
            index === selectedIndex
              ? 'bg-blue-50 text-blue-900'
              : 'hover:bg-gray-50'
          }`}
          onClick={() => handleSuggestionClick(suggestion)}
          role="option"
          aria-selected={index === selectedIndex}
          data-testid={`suggestion-${index}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-gray-900">
                {highlightMatch(suggestion.word, query)}
              </span>
              {suggestion.type === 'typo_correction' && (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                  Did you mean?
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {suggestion.frequency} searches
            </span>
          </div>
          {suggestion.type === 'typo_correction' && (
            <div className="mt-1 text-xs text-gray-400">
              Original: "{suggestion.originalQuery}" • Edit distance: {suggestion.editDistance} • Similarity: {(suggestion.similarity * 100).toFixed(0)}%
            </div>
          )}
          {suggestion.category && (
            <div className="mt-1 text-xs text-gray-400">
              {suggestion.category}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

ListView.propTypes = {
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      word: PropTypes.string.isRequired,
      frequency: PropTypes.number.isRequired,
      category: PropTypes.string,
      type: PropTypes.oneOf(['exact_match', 'typo_correction']),
      originalQuery: PropTypes.string,
      editDistance: PropTypes.number,
      similarity: PropTypes.number,
      correctionType: PropTypes.string,
    })
  ),
  query: PropTypes.string,
  selectedIndex: PropTypes.number,
  onSelect: PropTypes.func,
  className: PropTypes.string,
};

export default ListView;