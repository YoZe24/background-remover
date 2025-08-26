"use client";

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { ImageUploadProgress } from '@/features/backgroundRemover/types/image';

interface UseImageUploadProps {
  sessionId: string;
  // eslint-disable-next-line no-unused-vars
  onUploadSuccess: (result: { id: string; status: string; originalUrl: string }) => void;
  // eslint-disable-next-line no-unused-vars
  onUploadError: (errorMessage: string) => void;
  disabled?: boolean;
}

export function useImageUpload({ 
  sessionId, 
  onUploadSuccess, 
  onUploadError, 
  disabled = false 
}: UseImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ImageUploadProgress>({ 
    loaded: 0, 
    total: 0, 
    percentage: 0 
  });

  const uploadFile = useCallback(async (file: File) => {
    if (disabled || isUploading) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      const error = 'Please select a valid image file (JPEG, PNG, WebP, or GIF)';
      onUploadError(error);
      toast.error(error);
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const error = 'File size must be less than 50MB';
      onUploadError(error);
      toast.error(error);
      return;
    }

    setIsUploading(true);
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      // Create XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          setUploadProgress({
            loaded: e.loaded,
            total: e.total,
            percentage,
          });
        }
      });

      // Handle response
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
              try {
                const result = JSON.parse(xhr.responseText);
                resolve(result);
              } catch {
                reject(new Error('Invalid response format'));
              }
            } else {
              try {
                const error = JSON.parse(xhr.responseText);
                reject(new Error(error.error || 'Upload failed'));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
      });

      // Start upload
      xhr.open('POST', '/api/images/upload');
      xhr.send(formData);

      const result = await uploadPromise;
      
      onUploadSuccess(result);
      toast.success('Image uploaded successfully! Processing will start automatically.');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      onUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
    }
  }, [disabled, isUploading, onUploadError, onUploadSuccess, sessionId]);

  return {
    uploadFile,
    isUploading,
    uploadProgress
  };
}
