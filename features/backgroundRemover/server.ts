// Background Remover Feature - Server-Side Exports
// This file exports server-side components that require Next.js server environment

// Services (for server-side usage only)
export { ImageProcessor } from './libs/image-processor';
export { BackgroundRemovalService } from './libs/background-removal';

// Re-export types for convenience
export type {
  ProcessedImage,
  ProcessedImageResponse,
  ImageUploadRequest,
  ImageProcessingResponse,
  BackgroundRemovalConfig,
  ProcessingConfig,
  ProcessingStatus
} from './types/image';
