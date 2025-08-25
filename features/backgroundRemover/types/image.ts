export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProcessedImage {
  id: string;
  original_filename: string;
  original_url: string;
  processed_url: string | null;
  status: ProcessingStatus;
  error_message: string | null;
  file_size: number;
  dimensions: {
    width: number;
    height: number;
  } | null;
  processing_time_ms: number | null;
  user_session_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null; // For cleanup of temporary files
}

// API Response interfaces (camelCase for frontend)
export interface ProcessedImageResponse {
  id: string;
  originalFilename: string;
  originalUrl: string;
  processedUrl: string | null;
  status: ProcessingStatus;
  error: string | null;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  } | null;
  processingTimeMs: number | null;
  userSessionId: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface ImageUploadRequest {
  file: File;
  sessionId?: string;
}

export interface ImageProcessingResponse {
  id: string;
  status: ProcessingStatus;
  message: string;
  originalUrl?: string;
  processedUrl?: string;
  error?: string;
}

export interface ImageUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Background removal service configuration
export interface BackgroundRemovalConfig {
  service: 'remove.bg' | 'clipdrop' | 'photoroom';
  apiKey: string;
  quality?: 'auto' | 'hd' | '4k';
  format?: 'png' | 'jpg' | 'webp';
}

// Image processing pipeline configuration
export interface ProcessingConfig {
  maxFileSize: number; // in bytes
  allowedFormats: string[];
  outputFormat: 'png' | 'webp';
  outputQuality: number;
  maxDimensions: {
    width: number;
    height: number;
  };
}
