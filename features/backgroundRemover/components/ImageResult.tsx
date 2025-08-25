"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import type { ProcessedImageResponse } from '@/features/backgroundRemover/types/image';

interface ImageResultProps {
  imageId: string;
  onDelete?: () => void;
}

export default function ImageResult({ imageId, onDelete }: ImageResultProps) {
  const [imageData, setImageData] = useState<ProcessedImageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Poll for status updates
  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval>;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/images/${imageId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch image status');
        }

        setImageData(data);
        setIsLoading(false);

        // Stop polling when processing is complete or failed
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval);
          
          if (data.status === 'completed') {
            toast.success('Image processing completed!');
          } else if (data.status === 'failed') {
            toast.error(`Processing failed: ${data.error || 'Unknown error'}`);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch image status');
        setIsLoading(false);
        clearInterval(pollInterval);
      }
    };

    // Initial fetch
    pollStatus();

    // Set up polling every 2 seconds for pending/processing images
    pollInterval = setInterval(pollStatus, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [imageId]);

  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this image?');
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete image');
      }

      toast.success('Image deleted successfully');
      onDelete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!imageData?.processedUrl) return;

    try {
      const response = await fetch(imageData.processedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `processed-${imageData.originalFilename || 'image'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download image');
    }
  };

  const handleShare = async () => {
    if (!imageData?.id) return;

    const shareUrl = `${window.location.origin}/host/image/${imageData.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow duration-300 w-full">
        <div className="relative aspect-square bg-base-200 rounded-t-2xl overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="text-sm text-base-content/70">Loading...</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-info rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Processing</span>
          </div>
          <div className="text-xs text-base-content/50">Fetching image status...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-base-100 shadow-lg border border-error/20 w-full">
        <div className="relative aspect-square bg-base-200 rounded-t-2xl overflow-hidden">
          <div className="flex items-center justify-center h-full text-error">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm">Error loading image</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-error rounded-full"></div>
            <span className="text-sm font-medium text-error">Failed</span>
          </div>
          <div className="text-xs text-base-content/50">{error}</div>
        </div>
      </div>
    );
  }

  if (!imageData) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'failed': return 'bg-error';
      case 'processing': return 'bg-warning';
      default: return 'bg-info';
    }
  };

  const getCurrentImageUrl = () => {
    if (showOriginal || !imageData.processedUrl) {
      return imageData.originalUrl;
    }
    return imageData.processedUrl;
  };

  const getCurrentImageAlt = () => {
    return showOriginal ? 'Original image' : 'Processed image';
  };

  return (
    <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 w-full group">
      {/* Main Image Display */}
      <div className="relative aspect-square bg-base-200 rounded-t-2xl overflow-hidden">
        {getCurrentImageUrl() ? (
          <>
            <Image
              src={getCurrentImageUrl()}
              alt={getCurrentImageAlt()}
              fill
              className={`object-cover transition-all duration-500 ease-in-out transform ${
                imageData.status === 'processing' && !showOriginal ? 'blur-sm scale-105' : ''
              }`}
              sizes="(max-width: 768px) 100vw, 50vw"
              key={showOriginal ? 'original' : 'processed'} // Force re-render for smooth transition
            />

            {/* Processing Overlay */}
            {imageData.status === 'processing' && !showOriginal && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-[1px]">
                {/* Animated shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" style={{ animation: 'processing-shimmer 2s ease-in-out infinite' }}></div>
                
                {/* Central processing indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-base-100/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-primary/20">
                    <div className="flex flex-col items-center gap-4">
                      {/* Rotating AI processing icon */}
                      <div className="relative">
                        <div className="w-12 h-12 text-primary animate-spin" style={{ animationDuration: '3s' }}>
                          <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                      </div>
                      
                      {/* Processing text with typewriter effect */}
                      <div className="text-center">
                        <div className="text-sm font-semibold text-primary animate-pulse">
                          Removing background...
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </div>

                {/* Corner processing indicators */}
                <div className="absolute top-2 right-2 w-3 h-3 bg-warning rounded-full animate-pulse shadow-lg"></div>
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-info rounded-full animate-ping"></div>
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-success rounded-full animate-pulse" style={{ animationDelay: '500ms' }}></div>
              </div>
            )}
            
            {/* Toggle Button Overlay */}
            {imageData.originalUrl && imageData.processedUrl && imageData.status === 'completed' && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="absolute top-4 left-4 btn btn-md btn-circle bg-base-100/95 backdrop-blur-sm border-base-300 hover:bg-base-100 hover:scale-110 transition-all duration-200 shadow-xl opacity-0 group-hover:opacity-100"
                title={showOriginal ? 'Show processed' : 'Show original'}
              >
                <svg 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  className="w-5 h-5 transition-transform duration-300"
                  style={{ transform: showOriginal ? 'scaleX(-1)' : 'scaleX(1)' }}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" 
                  />
                </svg>
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-base-content/50">
            {imageData.status === 'processing' ? (
              <div className="text-center space-y-3">
                <div className="loading loading-spinner loading-lg text-primary"></div>
                <p className="text-sm">Processing...</p>
              </div>
            ) : imageData.status === 'failed' ? (
              <div className="text-center space-y-3 text-error">
                <div className="w-16 h-16 mx-auto">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm">Processing failed</p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto text-base-content/30">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm">Waiting for processing</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Status and Actions Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(imageData.status)}`}></div>
            <span className="text-sm font-medium capitalize">{imageData.status}</span>
            {imageData.processingTimeMs && (
              <span className="badge badge-ghost badge-xs">
                {imageData.processingTimeMs}ms
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
            {imageData.processedUrl && (
              <>
                <button 
                  className="btn btn-s btn-primary"
                  onClick={handleDownload}
                  title="Download processed image"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button 
                  className="btn btn-s btn-ghost"
                  onClick={handleShare}
                  title="Share image"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </>
            )}
            <button 
              className="btn btn-s btn-ghost text-error hover:btn-error hover:text-error-content"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete image"
            >
              {isDeleting ? (
                <div className="loading loading-spinner loading-xs"></div>
              ) : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {imageData.status === 'failed' && imageData.error && (
          <div className="text-xs text-error bg-error/10 p-2 rounded">
            {imageData.error}
          </div>
        )}

        {/* Image Info */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-base-content/80 truncate" title={imageData.originalFilename}>
            {imageData.originalFilename}
          </div>
          <div className="flex gap-2 text-xs text-base-content/60">
            {imageData.dimensions && (
              <span>{imageData.dimensions.width} × {imageData.dimensions.height}</span>
            )}
            <span>•</span>
            <span>{Math.round(imageData.fileSize / 1024)} KB</span>
          </div>
        </div>

        {/* Show current view indicator
        {imageData.originalUrl && imageData.processedUrl && (
          <div className="text-xs text-base-content/50 text-center">
            Showing: {showOriginal ? 'Original' : 'Processed'} • Click toggle to switch
          </div>
        )} */}
      </div>
    </div>
  );
}
