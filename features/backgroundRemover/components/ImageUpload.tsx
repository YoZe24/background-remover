"use client";

import React, { useState, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { ImageUploadProgress } from '@/features/backgroundRemover/types/image';

interface ImageUploadProps {
  // eslint-disable-next-line no-unused-vars
  onUploadSuccess: (result: { id: string; status: string; originalUrl: string }) => void;
  // eslint-disable-next-line no-unused-vars
  onUploadError: (errorMessage: string) => void;
  sessionId: string;
  disabled?: boolean;
}

export default function ImageUpload({ 
  onUploadSuccess, 
  onUploadError, 
  sessionId, 
  disabled = false 
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ImageUploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
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
      toast.success('Image uploaded successfully! Processing started...');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      onUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
    }
  }, [disabled, isUploading, onUploadError, onUploadSuccess, sessionId]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleButtonClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Upload area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging ? 'border-primary bg-primary/5 scale-105' : 'border-base-300 hover:border-primary/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-base-50'}
          ${isUploading ? 'border-primary bg-primary/5' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        {isUploading ? (
          <div className="space-y-4">
            <div className="loading loading-spinner loading-lg text-primary mx-auto"></div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-primary">Uploading...</p>
              <div className="w-full bg-base-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-base-content/70">
                {uploadProgress.percentage}% • {Math.round(uploadProgress.loaded / 1024)} KB / {Math.round(uploadProgress.total / 1024)} KB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Upload icon */}
            <div className="mx-auto w-16 h-16 text-base-content/40">
              <svg 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                className="w-full h-full"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="1.5" 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
            </div>

            {/* Upload text */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-base-content">
                {isDragging ? 'Drop your image here' : 'Upload an image'}
              </h3>
              <p className="text-base-content/70">
                Drag and drop or click to select
              </p>
              <p className="text-sm text-base-content/50">
                Supports JPEG, PNG, WebP, and GIF up to 50MB
              </p>
            </div>

            {/* Upload button */}
            <button 
              className="btn btn-primary btn-wide"
              disabled={disabled}
            >
              Choose File
            </button>
          </div>
        )}
      </div>

      {/* Feature highlights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2 text-base-content/70">
          <div className="w-5 h-5 text-success">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span>AI Background Removal</span>
        </div>
        <div className="flex items-center gap-2 text-base-content/70">
          <div className="w-5 h-5 text-success">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span>Horizontal Flip</span>
        </div>
        <div className="flex items-center gap-2 text-base-content/70">
          <div className="w-5 h-5 text-success">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span>Instant Download</span>
        </div>
      </div>
    </div>
  );
}