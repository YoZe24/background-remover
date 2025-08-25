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
    <div className="w-full max-w-lg mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Upload area - compact elegant square with rounded corners */}
      <div
        className={`
          relative aspect-square border-3 border-dashed rounded-3xl p-8 text-center 
          transition-all duration-500 ease-out group overflow-hidden
          flex flex-col items-center justify-center
          ${isDragging 
            ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent scale-[1.02] shadow-2xl shadow-primary/20' 
            : 'border-base-300/60 hover:border-primary/40 hover:shadow-xl hover:shadow-base-content/5'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:bg-gradient-to-br hover:from-base-100 hover:to-base-50'
          }
          ${isUploading 
            ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-2xl shadow-primary/20' 
            : ''
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        {/* Background pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-500">
          <div className="w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500 w-full">
            {/* Elegant loading spinner */}
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
              <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div className="space-y-6 text-center w-full max-w-xs">
              <div className="space-y-3">
                <p className="text-2xl font-bold text-primary tracking-tight">Processing</p>
                <p className="text-base text-base-content/60 font-medium">Preparing your image...</p>
              </div>
              
              {/* Enhanced progress bar */}
              <div className="space-y-3">
                <div className="relative w-full bg-base-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full 
                               transition-all duration-700 ease-out shadow-lg"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-primary">{uploadProgress.percentage}%</span>
                  <span className="text-base-content/50">
                    {Math.round(uploadProgress.loaded / 1024)} KB / {Math.round(uploadProgress.total / 1024)} KB
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-8 group-hover:scale-105 transition-transform duration-500 w-full">
            {/* Elegant upload icon */}
            <div className="relative w-28 h-28">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/20 rotate-3 
                            group-hover:rotate-6 transition-transform duration-500"></div>
              <div className="relative w-full h-full text-primary/70 group-hover:text-primary transition-colors duration-300">
                <svg 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  className="w-full h-full drop-shadow-sm"
                  strokeWidth="1.5"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" 
                  />
                </svg>
              </div>
            </div>

            {/* Upload text with enhanced typography */}
            <div className="space-y-6 text-center w-full max-w-sm">
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-base-content tracking-tight">
                  {isDragging ? (
                    <span className="text-primary animate-pulse">Drop it here</span>
                  ) : (
                    'Upload Image'
                  )}
                </h3>
                <p className="text-lg text-base-content/60 font-medium">
                  Drag & drop or click to browse
                </p>
              </div>
              <p className="text-sm text-base-content/40 leading-relaxed">
                JPEG, PNG, WebP, GIF • Up to 50MB
              </p>
            </div>

            {/* Elegant call-to-action button */}
            <button 
              className="btn btn-primary btn-lg rounded-2xl px-8 py-4 text-lg font-semibold
                       shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30
                       transform hover:scale-105 transition-all duration-300
                       border-0 bg-gradient-to-r from-primary to-primary/90
                       hover:from-primary/90 hover:to-primary"
              disabled={disabled}
            >
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Choose File
              </span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}