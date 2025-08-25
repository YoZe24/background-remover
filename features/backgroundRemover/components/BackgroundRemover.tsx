"use client";

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ImageUpload from './ImageUpload';
import ImageEdit from './ImageEdit';
import SampleImages from './SampleImages';

type ViewMode = 'upload' | 'edit';

interface UploadResult {
  id: string;
  status: string;
  originalUrl: string;
}

export default function BackgroundRemover() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [sessionId] = useState(() => uuidv4());

  const handleUploadSuccess = useCallback((result: UploadResult) => {
    // Immediate transition for faster response
    setCurrentImageId(result.id);
    setViewMode('edit');
  }, []);

  const handleUploadError = useCallback((errorMessage: string) => {
    console.error('Upload error:', errorMessage);
    // Error is already handled by the upload component with toast
  }, []);

  const handleDelete = useCallback(() => {
    setCurrentImageId(null);
    setViewMode('upload');
  }, []);

  const handleSampleSelect = useCallback(async (file: File) => {
    // Create a mock upload event for sample images
    // This reuses the existing upload logic
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    try {
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload sample image');
      }

      const result = await response.json();
      handleUploadSuccess(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload sample image';
      handleUploadError(errorMessage);
    }
  }, [sessionId, handleUploadSuccess, handleUploadError]);

  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
      {viewMode === 'upload' ? (
        <div className="w-full max-w-3xl mx-auto space-y-6">
          {/* Upload section */}
          <div className="flex flex-col items-center space-y-6">
            <ImageUpload
              sessionId={sessionId}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
            <SampleImages
              onSampleSelect={handleSampleSelect}
            />
          </div>
        </div>
      ) : (
        currentImageId && (
          <ImageEdit
            imageId={currentImageId}
            onDelete={handleDelete}
          />
        )
      )}
    </div>
  );
}
