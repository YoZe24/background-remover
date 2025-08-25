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
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="loading loading-spinner loading-md text-primary"></div>
            <div>
              <h3 className="font-semibold">Loading image status...</h3>
              <p className="text-sm text-base-content/70">Please wait while we fetch the latest information</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-base-100 shadow-xl border border-error/20">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 text-error">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-error">Error</h3>
              <p className="text-sm text-base-content/70">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!imageData) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'failed': return 'text-error';
      case 'processing': return 'text-warning';
      default: return 'text-info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg fill="currentColor" viewBox="0 0 20 20" className="w-5 h-5">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
        return (
          <svg fill="currentColor" viewBox="0 0 20 20" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'processing':
        return <div className="loading loading-spinner loading-sm"></div>;
      default:
        return (
          <svg fill="currentColor" viewBox="0 0 20 20" className="w-5 h-5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        {/* Header with status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={getStatusColor(imageData.status)}>
              {getStatusIcon(imageData.status)}
            </div>
            <h3 className="font-semibold capitalize">{imageData.status}</h3>
            {imageData.processingTimeMs && (
              <span className="badge badge-ghost badge-sm">
                {imageData.processingTimeMs}ms
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {imageData.processedUrl && (
              <>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleDownload}
                >
                  Download
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={handleShare}
                >
                  Share
                </button>
              </>
            )}
            <button 
              className="btn btn-ghost btn-sm text-error"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Error message */}
        {imageData.status === 'failed' && imageData.error && (
          <div className="alert alert-error">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{imageData.error}</span>
          </div>
        )}

        {/* Images comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Original image */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Original</h4>
            <div className="relative aspect-square bg-base-200 rounded-lg overflow-hidden">
              {imageData.originalUrl ? (
                <Image
                  src={imageData.originalUrl}
                  alt="Original image"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-base-content/50">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto text-base-content/30">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm">Loading original image...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Processed image */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Processed</h4>
            <div className="relative aspect-square bg-base-200 rounded-lg overflow-hidden">
              {imageData.processedUrl ? (
                <Image
                  src={imageData.processedUrl}
                  alt="Processed image"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-base-content/50">
                  {imageData.status === 'processing' ? (
                    <div className="text-center space-y-2">
                      <div className="loading loading-spinner loading-lg text-primary"></div>
                      <p className="text-sm">Processing...</p>
                    </div>
                  ) : imageData.status === 'failed' ? (
                    <div className="text-center space-y-2 text-error">
                      <div className="w-12 h-12 mx-auto">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm">Processing failed</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 mx-auto text-base-content/30">
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
          </div>
        </div>

        {/* Image info */}
        <div className="flex flex-wrap gap-2 mt-4 text-xs text-base-content/70">
          <span className="badge badge-ghost">
            {imageData.originalFilename}
          </span>
          {imageData.dimensions && (
            <span className="badge badge-ghost">
              {imageData.dimensions.width} × {imageData.dimensions.height}
            </span>
          )}
          <span className="badge badge-ghost">
            {Math.round(imageData.fileSize / 1024)} KB
          </span>
          <span className="badge badge-ghost">
            {new Date(imageData.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
