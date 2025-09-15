import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useErrorHandler } from './useErrorHandler';
import { ToastProvider } from '../components/ToastContainer';

// Mock the ToastContainer
const mockShowError = vi.fn();
const mockShowWarning = vi.fn();

vi.mock('../components/ToastContainer', () => ({
  useToast: () => ({
    showError: mockShowError,
    showWarning: mockShowWarning,
  }),
}));

// Mock the apiClient
vi.mock('../utils/apiClient', () => ({
  getErrorMessage: (error) => error.message || 'Unknown error',
  isRetryableError: (error) => error.isRetryable || false,
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error
    console.error = vi.fn();
  });

  it('handles basic error', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    const errorDetails = result.current.handleError(error);

    expect(errorDetails).toEqual({
      message: 'Test error',
      code: 'UNKNOWN_ERROR',
      statusCode: null,
      isRetryable: false,
      originalError: error,
    });
  });

  it('shows error toast by default', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    result.current.handleError(error);

    expect(mockShowError).toHaveBeenCalledWith('Test error', 6000);
  });

  it('does not show toast when showToast is false', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    result.current.handleError(error, { showToast: false });

    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockShowWarning).not.toHaveBeenCalled();
  });

  it('uses custom message when provided', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Original error');

    const errorDetails = result.current.handleError(error, {
      customMessage: 'Custom error message',
    });

    expect(errorDetails.message).toBe('Custom error message');
    expect(mockShowError).toHaveBeenCalledWith('Custom error message', 6000);
  });

  it('logs error when logError is true', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    result.current.handleError(error, { logError: true });

    expect(console.error).toHaveBeenCalledWith('Error handled:', error);
  });

  it('does not log error when logError is false', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    result.current.handleError(error, { logError: false });

    expect(console.error).not.toHaveBeenCalled();
  });

  it('shows warning toast for retryable errors with onRetry callback', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Retryable error');
    error.isRetryable = true;
    const onRetry = vi.fn();

    result.current.handleError(error, { onRetry });

    expect(mockShowWarning).toHaveBeenCalledWith('Retryable error Click to retry.', 8000);
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('handles async errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const asyncFn = vi.fn().mockRejectedValue(new Error('Async error'));

    await expect(
      result.current.handleAsyncError(asyncFn)
    ).rejects.toEqual({
      message: 'Async error',
      code: 'UNKNOWN_ERROR',
      statusCode: null,
      isRetryable: false,
      originalError: expect.any(Error),
    });

    expect(mockShowError).toHaveBeenCalledWith('Async error', 6000);
  });

  it('returns result for successful async function', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const asyncFn = vi.fn().mockResolvedValue('Success result');

    const resultValue = await result.current.handleAsyncError(asyncFn);

    expect(resultValue).toBe('Success result');
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('creates error handler with options', () => {
    const { result } = renderHook(() => useErrorHandler());
    const options = { showToast: false, customMessage: 'Custom message' };
    
    const errorHandler = result.current.createErrorHandler(options);
    const error = new Error('Test error');

    const errorDetails = errorHandler(error);

    expect(errorDetails.message).toBe('Custom message');
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('handles error with code and statusCode', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('HTTP error');
    error.code = 'HTTP_500';
    error.statusCode = 500;

    const errorDetails = result.current.handleError(error);

    expect(errorDetails).toEqual({
      message: 'HTTP error',
      code: 'HTTP_500',
      statusCode: 500,
      isRetryable: false,
      originalError: error,
    });
  });
});