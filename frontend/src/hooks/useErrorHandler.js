import { useCallback } from 'react';
import { useToast } from '../components/ToastContainer';
import { getErrorMessage, isRetryableError } from '../utils/apiClient';

export const useErrorHandler = () => {
  const { showError, showWarning } = useToast();

  const handleError = useCallback((error, options = {}) => {
    const {
      showToast = true,
      logError = true,
      customMessage = null,
      onRetry = null,
    } = options;

    // Log error for debugging
    if (logError) {
      console.error('Error handled:', error);
    }

    // Get user-friendly error message
    const message = customMessage || getErrorMessage(error);

    // Show toast notification
    if (showToast) {
      if (isRetryableError(error) && onRetry) {
        // Show warning with retry option for retryable errors
        showWarning(`${message} Click to retry.`, 8000);
      } else {
        // Show error toast
        showError(message, 6000);
      }
    }

    // Return error details for component use
    return {
      message,
      code: error.code || 'UNKNOWN_ERROR',
      statusCode: error.statusCode || null,
      isRetryable: isRetryableError(error),
      originalError: error,
    };
  }, [showError, showWarning]);

  const handleAsyncError = useCallback(async (asyncFn, options = {}) => {
    try {
      return await asyncFn();
    } catch (error) {
      const errorDetails = handleError(error, options);
      throw errorDetails;
    }
  }, [handleError]);

  const createErrorHandler = useCallback((options = {}) => {
    return (error) => handleError(error, options);
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    createErrorHandler,
  };
};

export default useErrorHandler;