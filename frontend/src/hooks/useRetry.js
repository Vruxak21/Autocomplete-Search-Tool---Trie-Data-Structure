import { useState, useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';

export const useRetry = (asyncFn, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    retryCondition = () => true,
    onRetry = null,
    onMaxRetriesReached = null,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { handleError } = useErrorHandler();

  const calculateDelay = useCallback((attempt) => {
    if (exponentialBackoff) {
      return Math.min(retryDelay * Math.pow(2, attempt), 10000);
    }
    return retryDelay;
  }, [retryDelay, exponentialBackoff]);

  const execute = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    let lastError = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await asyncFn(...args);
        setIsLoading(false);
        return result;
      } catch (err) {
        lastError = err;
        attempt++;

        // Check if we should retry
        if (attempt <= maxRetries && retryCondition(err, attempt)) {
          setRetryCount(attempt);
          
          // Call onRetry callback if provided
          if (onRetry) {
            onRetry(err, attempt, maxRetries);
          }

          // Wait before retrying
          const delay = calculateDelay(attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    // All retries exhausted
    setIsLoading(false);
    const errorDetails = handleError(lastError, { showToast: false });
    setError(errorDetails);

    // Call onMaxRetriesReached callback if provided
    if (onMaxRetriesReached) {
      onMaxRetriesReached(lastError, maxRetries);
    }

    throw errorDetails;
  }, [
    asyncFn,
    maxRetries,
    retryCondition,
    onRetry,
    onMaxRetriesReached,
    calculateDelay,
    handleError,
  ]);

  const retry = useCallback((...args) => {
    return execute(...args);
  }, [execute]);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsLoading(false);
  }, []);

  return {
    execute,
    retry,
    reset,
    isLoading,
    error,
    retryCount,
    canRetry: error && retryCount < maxRetries,
  };
};

export default useRetry;