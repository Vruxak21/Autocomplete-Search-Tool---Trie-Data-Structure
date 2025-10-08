/**
 * @fileoverview Error boundary component for tree rendering failures
 */

import React from 'react';
import PropTypes from 'prop-types';
import { VIEW_MODES, ERROR_TYPES, FALLBACK_ACTIONS } from '../types/tree';

/**
 * Error boundary that catches tree rendering errors and provides fallback UI
 */
class TreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Tree rendering error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Report error to parent component
    if (this.props.onError) {
      const treeError = {
        type: ERROR_TYPES.RENDER_ERROR,
        message: error.message || 'Tree rendering failed',
        fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW,
        originalError: error
      };
      
      this.props.onError(treeError);
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    // Limit retry attempts
    if (newRetryCount > this.props.maxRetries) {
      if (this.props.onFallback) {
        this.props.onFallback(VIEW_MODES.LIST);
      }
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount
    });

    // Notify parent about retry attempt
    if (this.props.onRetry) {
      this.props.onRetry(newRetryCount);
    }
  };

  handleFallback = () => {
    if (this.props.onFallback) {
      this.props.onFallback(VIEW_MODES.LIST);
    }
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.props.maxRetries;
      
      return (
        <div className="tree-error-boundary p-4 text-center border-t border-gray-200">
          <div className="text-red-600 mb-2 font-medium">
            Tree View Error
          </div>
          
          <div className="text-sm text-gray-600 mb-4">
            {this.props.userFriendlyMessage || 
             'Something went wrong while displaying the tree view. You can try again or switch to list view.'}
          </div>
          
          {this.props.showErrorDetails && this.state.error && (
            <details className="text-xs text-gray-500 mb-4 text-left">
              <summary className="cursor-pointer hover:text-gray-700">
                Technical Details
              </summary>
              <div className="mt-2 p-2 bg-gray-50 rounded border font-mono">
                <div className="font-semibold">Error:</div>
                <div className="mb-2">{this.state.error.message}</div>
                {this.state.errorInfo && (
                  <>
                    <div className="font-semibold">Stack Trace:</div>
                    <pre className="whitespace-pre-wrap text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            </details>
          )}
          
          <div className="flex justify-center space-x-3">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="retry-button"
              >
                Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/${this.props.maxRetries})`}
              </button>
            )}
            
            <button
              onClick={this.handleFallback}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              data-testid="fallback-button"
            >
              Switch to List View
            </button>
          </div>
          
          {!canRetry && this.state.retryCount > 0 && (
            <div className="mt-3 text-xs text-gray-500">
              Maximum retry attempts reached. Please use list view.
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

TreeErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onError: PropTypes.func,
  onRetry: PropTypes.func,
  onFallback: PropTypes.func,
  maxRetries: PropTypes.number,
  userFriendlyMessage: PropTypes.string,
  showErrorDetails: PropTypes.bool
};

TreeErrorBoundary.defaultProps = {
  maxRetries: 2,
  showErrorDetails: false,
  userFriendlyMessage: null
};

export default TreeErrorBoundary;