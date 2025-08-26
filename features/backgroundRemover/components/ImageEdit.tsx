"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import type { ProcessedImageResponse } from '@/features/backgroundRemover/types/image';
import { useBackgroundDeletion } from '@/features/backgroundRemover/hooks/useBackgroundDeletion';

interface ImageEditProps {
  imageId: string;
  onDelete: () => void;
}

export default function ImageEdit({ imageId, onDelete }: ImageEditProps) {
  const [imageData, setImageData] = useState<ProcessedImageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  // Initialize background deletion hook
  const { deleteInBackground } = useBackgroundDeletion({
    showSuccessToast: true,
    showErrorToast: true,
  });

  // Poll for status updates
  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval>;
    let isMounted = true;

    const pollStatus = async () => {
      if (!isMounted) return;

      try {
        // Check if this is an optimistic (temporary) image ID
        const isOptimistic = imageId.startsWith('temp_');
        
        if (isOptimistic) {
          // For optimistic IDs, show upload state until real ID comes
          if (isMounted) {
            setImageData({
              id: imageId,
              status: 'uploading',
              originalUrl: '',
              processedUrl: null,
              originalFilename: 'Sample Image',
              fileSize: 0,
              dimensions: { width: 0, height: 0 },
              processingTimeMs: null,
              error: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userSessionId: null,
              expiresAt: null
            });
            setIsLoading(false);
          }
          return; // Don't try to fetch from API for optimistic IDs
        }

        const response = await fetch(`/api/images/${imageId}`);
        const data = await response.json();

        console.log('🔍 [ImageEdit] Image data:', data);
        console.log('🔍 [ImageEdit] Image response:', response);
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch image status');
        }

        if (!isMounted) return;

        setImageData(data);
        setIsLoading(false);

        // Stop polling when processing is complete or failed
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval);
          
          if (data.status === 'completed') {
            toast.success('Background removal completed!');
          } else if (data.status === 'failed') {
            toast.error(`Processing failed: ${data.error || 'Unknown error'}`);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch image status');
        setIsLoading(false);
        clearInterval(pollInterval);
      }
    };

    // Initial fetch
    pollStatus();

    // Set up polling every 2 seconds for pending/processing images (reduced frequency)
    // Don't poll for optimistic IDs, wait for real ID
    if (!imageId.startsWith('temp_')) {
      pollInterval = setInterval(pollStatus, 2000); // Increased from 1000ms to 2000ms
    }

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [imageId]);

  const handleDelete = useCallback(() => {
    const confirmDelete = window.confirm('Are you sure you want to delete this image?');
    if (!confirmDelete) return;

    // Immediately navigate to the next component for better UX
    onDelete();
    
    // Delete in background without blocking the UI
    deleteInBackground(imageId);
  }, [imageId, onDelete, deleteInBackground]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'failed': return 'bg-error';
      case 'processing': return 'bg-warning';
      case 'uploading': return 'bg-info';
      default: return 'bg-info';
    }
  };

  const getCurrentImageUrl = () => {
    if (showOriginal || !imageData?.processedUrl) {
      return imageData?.originalUrl;
    }
    return imageData.processedUrl;
  };

  const shouldShowTransparentBackground = () => {
    return !showOriginal && imageData?.processedUrl && imageData.status === 'completed';
  };

  if (isLoading || !imageData) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left side - Image placeholder */}
          <div className="flex-1">
            <div className="relative aspect-[4/3] max-h-[60vh] bg-base-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className="loading loading-spinner loading-lg text-primary"></div>
                  <p className="text-sm text-base-content/70">Loading image...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Actions placeholder */}
          <div className="w-full lg:w-72">
            <div className="bg-base-100 rounded-xl p-5 shadow-lg border border-base-200 h-full flex flex-col justify-between">
              <div className="space-y-6">
                <div className="skeleton h-8 w-3/4"></div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="skeleton h-14 flex-1"></div>
                  <div className="skeleton h-14 w-14"></div>
                </div>
                <div className="skeleton h-12 w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="alert alert-error">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - Image display */}
        <div className="flex-1 relative">
          <div className={`relative max-h-[60vh] rounded-xl overflow-hidden shadow-lg group transition-all duration-500 ${
            shouldShowTransparentBackground() ? 'transparent-bg' : 'bg-base-200'
          }`}>
            {getCurrentImageUrl() ? (
              <>
                <Image
                  src={getCurrentImageUrl()!}
                  alt={showOriginal ? 'Original image' : 'Processed image'}
                  width={imageData?.dimensions?.width || 800}
                  height={imageData?.dimensions?.height || 600}
                  className={`w-full h-auto max-h-[60vh] object-contain transition-all duration-500 ease-in-out ${
                    imageData.status === 'processing' && !showOriginal ? 'blur-sm scale-105' : ''
                  }`}
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />

                {/* Processing Overlay */}
                {imageData.status === 'processing' && !showOriginal && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-[1px]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-base-100/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-primary/20">
                        <div className="flex flex-col items-center gap-6">
                          <div className="w-16 h-16 text-primary animate-spin" style={{ animationDuration: '3s' }}>
                            <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-primary animate-pulse">
                              Removing background...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Toggle Button Overlay - Top Left */}
                {imageData.originalUrl && imageData.processedUrl && imageData.status === 'completed' && (
                  <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                    <button
                      onClick={() => setShowOriginal(!showOriginal)}
                      className={`btn btn-sm rounded-full backdrop-blur-sm border hover:scale-110 transition-all duration-200 shadow-lg ${
                        showOriginal 
                          ? 'bg-primary/90 border-primary text-primary-content hover:bg-primary' 
                          : 'bg-base-100/95 border-base-300 hover:bg-base-100'
                      }`}
                      title={showOriginal ? 'Show processed (with transparent background)' : 'Show original'}
                    >
                      <svg 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        className="w-4 h-4 transition-transform duration-300"
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
                  </div>
                )}

                {/* Delete Button */}
                <button 
                  className="absolute top-4 right-4 btn btn-sm btn-circle bg-error/90 backdrop-blur-sm border-error-content/20 hover:bg-error hover:scale-110 transition-all duration-200 shadow-lg text-error-content opacity-0 group-hover:opacity-100 z-10"
                  onClick={handleDelete}
                  title="Delete image"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center text-base-content/50" style={{ 
                minHeight: imageData?.status === 'uploading' ? '300px' : '400px',
                aspectRatio: imageData?.status === 'uploading' ? '4/3' : 'auto'
              }}>
                <div className="text-center space-y-3">
                  <div className="loading loading-spinner loading-lg text-primary"></div>
                  <p className="text-sm">
                    {imageData?.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Actions panel */}
        <div className="w-full lg:w-72">
          <div className="bg-base-100 rounded-xl p-5 shadow-lg border border-base-200 h-full flex flex-col justify-between">
            {/* Top section - Status and Secondary Actions */}
            <div className="space-y-6">
              {/* Status section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(imageData.status)}`}></div>
                  <span className="text-lg font-medium capitalize">{imageData.status}</span>
                  {imageData.processingTimeMs && (
                    <span className="badge badge-ghost badge-sm">
                      {imageData.processingTimeMs}ms
                    </span>
                  )}
                </div>
              </div>



              {/* Error message */}
              {imageData.status === 'failed' && imageData.error && (
                <div className="alert alert-error alert-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{imageData.error}</span>
                </div>
              )}
            </div>

            {/* Bottom section - Primary Action and Metadata */}
            <div className="space-y-4">
              {/* Primary Action - Download with Share (when available) */}
              {imageData.processedUrl && (
                <div className="flex gap-3">
                  <button 
                    className="btn btn-primary btn-lg flex-1 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                    onClick={handleDownload}
                    title="Download processed image"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6 mr-3">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-lg font-semibold">Download</span>
                  </button>
                  
                  <button 
                    className="btn btn-outline btn-lg btn-square rounded-xl"
                    onClick={handleShare}
                    title="Share image"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Image metadata - Single row */}
              <div className="bg-base-50 rounded-lg p-3">
                <div className="flex justify-center items-center gap-4 text-xs text-base-content/60">
                  {imageData.dimensions && (
                    <span>{imageData.dimensions.width} × {imageData.dimensions.height}</span>
                  )}
                  <span>•</span>
                  <span>{Math.round(imageData.fileSize / 1024)} KB</span>
                  <span>•</span>
                  <span>PNG</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
