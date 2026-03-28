import { Alert } from 'react-native';

/**
 * Show a user-friendly error alert from an API error or unknown error.
 * Use this to replace silent catch blocks.
 */
export function showError(error: unknown, fallbackMessage = 'Something went wrong. Please try again.') {
  let message = fallbackMessage;
  if (error && typeof error === 'object' && 'message' in error) {
    message = (error as { message: string }).message || fallbackMessage;
  }
  Alert.alert('Error', message);
}

/**
 * Show error only for real failures, not "no data yet" situations.
 * Useful for optional data loads where 404 is expected.
 */
export function showErrorIfNotEmpty(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 404) return; // Expected — no data yet
  }
  showError(error);
}
