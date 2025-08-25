import { useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface UseBackgroundDeletionOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

interface UseBackgroundDeletionReturn {
  deleteInBackground: (imageId: string) => Promise<void>;
  pendingDeletions: Set<string>;
}

/**
 * Custom hook for handling background image deletion with optimistic UI updates
 * Follows the principle of immediate UI response with background processing
 */
export function useBackgroundDeletion(
  options: UseBackgroundDeletionOptions = {}
): UseBackgroundDeletionReturn {
  const {
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  // Track pending deletions to prevent duplicate operations
  const pendingDeletionsRef = useRef<Set<string>>(new Set());

  const deleteInBackground = useCallback(async (imageId: string) => {
    // Prevent duplicate deletion attempts
    if (pendingDeletionsRef.current.has(imageId)) {
      return;
    }

    // Add to pending deletions
    pendingDeletionsRef.current.add(imageId);

    try {
      // Perform the deletion in the background
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete image');
      }

      // Success handling
      if (showSuccessToast) {
        toast.success('Image deleted successfully');
      }
      onSuccess?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete image';
      
      if (showErrorToast) {
        toast.error(errorMessage);
      }
      onError?.(errorMessage);

      // Log error for debugging
      console.error('Background deletion failed:', error);
    } finally {
      // Remove from pending deletions
      pendingDeletionsRef.current.delete(imageId);
    }
  }, [onSuccess, onError, showSuccessToast, showErrorToast]);

  return {
    deleteInBackground,
    pendingDeletions: pendingDeletionsRef.current,
  };
}
