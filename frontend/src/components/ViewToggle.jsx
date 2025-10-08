/**
 * @fileoverview ViewToggle component for switching between tree and list visualization modes
 * 
 * This component provides a toggle interface that allows users to switch between
 * different visualization modes for search results. It includes:
 * - Accessible tab-based interface with proper ARIA attributes
 * - Visual indicators for the current mode
 * - Smooth transitions and hover effects
 * - Keyboard navigation support
 * - Configurable sizing and styling
 * 
 * @author Tree Visualization Team
 * @since 1.0.0
 */

import React from 'react';
import PropTypes from 'prop-types';
import { VIEW_MODES } from '../types/tree.js';

/**
 * ViewToggle component that provides an accessible toggle interface for switching
 * between tree and list visualization modes
 * 
 * @component
 * @example
 * // Basic usage
 * <ViewToggle
 *   currentMode="list"
 *   onModeChange={(mode) => setViewMode(mode)}
 * />
 * 
 * @example
 * // With custom styling and size
 * <ViewToggle
 *   currentMode="tree"
 *   onModeChange={handleModeChange}
 *   size="large"
 *   className="my-4"
 *   disabled={isLoading}
 * />
 * 
 * @example
 * // Controlled component with state management
 * const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
 * 
 * <ViewToggle
 *   currentMode={viewMode}
 *   onModeChange={(newMode) => {
 *     setViewMode(newMode);
 *     localStorage.setItem('preferredViewMode', newMode);
 *   }}
 * />
 */
/**
 * @param {Object} props - Component props
 * @param {string} [props.currentMode=VIEW_MODES.LIST] - Currently active view mode
 * @param {Function} props.onModeChange - Callback fired when view mode changes
 * @param {boolean} [props.disabled=false] - Whether the toggle is disabled
 * @param {string} [props.className=''] - Additional CSS classes to apply
 * @param {string} [props.size='medium'] - Size variant of the toggle buttons
 */
const ViewToggle = ({
  currentMode = VIEW_MODES.LIST,
  onModeChange,
  disabled = false,
  className = '',
  size = 'medium'
}) => {
  /**
   * Handles view mode change events
   * Only triggers callback if the new mode is different and component is not disabled
   * 
   * @param {string} newMode - The new view mode to switch to
   */
  const handleModeChange = (newMode) => {
    if (newMode !== currentMode && onModeChange && !disabled) {
      onModeChange(newMode);
    }
  };

  const baseButtonClasses = `
    inline-flex items-center justify-center font-medium transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const activeClasses = 'bg-blue-600 text-white shadow-sm';
  const inactiveClasses = 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900';

  return (
    <div 
      className={`inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm ${className}`}
      role="tablist"
      aria-label="View mode selection"
    >
      <button
        type="button"
        className={`
          ${baseButtonClasses}
          ${sizeClasses[size]}
          ${currentMode === VIEW_MODES.LIST ? activeClasses : inactiveClasses}
          rounded-md mr-1
        `}
        onClick={() => handleModeChange(VIEW_MODES.LIST)}
        disabled={disabled}
        role="tab"
        aria-selected={currentMode === VIEW_MODES.LIST}
        aria-controls="suggestions-content"
        data-testid="list-view-button"
        title="Switch to list view"
      >
        <svg 
          className="w-4 h-4 mr-1.5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 6h16M4 10h16M4 14h16M4 18h16" 
          />
        </svg>
        List
      </button>
      
      <button
        type="button"
        className={`
          ${baseButtonClasses}
          ${sizeClasses[size]}
          ${currentMode === VIEW_MODES.TREE ? activeClasses : inactiveClasses}
          rounded-md
        `}
        onClick={() => handleModeChange(VIEW_MODES.TREE)}
        disabled={disabled}
        role="tab"
        aria-selected={currentMode === VIEW_MODES.TREE}
        aria-controls="suggestions-content"
        data-testid="tree-view-button"
        title="Switch to tree view"
      >
        <svg 
          className="w-4 h-4 mr-1.5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 5v4M16 5v4" 
          />
        </svg>
        Tree
      </button>
    </div>
  );
};

ViewToggle.propTypes = {
  /** Currently active view mode (tree or list) */
  currentMode: PropTypes.oneOf([VIEW_MODES.TREE, VIEW_MODES.LIST]),
  /** Callback fired when view mode changes - receives (newMode) */
  onModeChange: PropTypes.func.isRequired,
  /** Whether the toggle buttons are disabled */
  disabled: PropTypes.bool,
  /** Additional CSS classes to apply to the container */
  className: PropTypes.string,
  /** Size variant for the toggle buttons */
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default ViewToggle;