"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useImageUpload } from '@/features/backgroundRemover/hooks/useImageUpload';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use the shared upload hook
  const { uploadFile, isUploading, uploadProgress } = useImageUpload({
    sessionId,
    onUploadSuccess,
    onUploadError,
    disabled,
  });

  const handleFileUpload = useCallback(async (file: File) => {
    await uploadFile(file);
    
    // Reset file input after upload
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadFile]);

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