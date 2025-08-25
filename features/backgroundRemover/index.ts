// Background Remover Feature - Main Export Index
// This file centralizes all exports for easier imports

// Components
export { default as ImageUpload } from './components/ImageUpload';
export { default as ImageResult } from './components/ImageResult';

// Types
export type {
  ProcessedImage,
  ProcessedImageResponse,
  ImageUploadRequest,
  ImageProcessingResponse,
  ImageUploadProgress,
  BackgroundRemovalConfig,
  ProcessingConfig,
  ProcessingStatus
} from './types/image';

// Services (for advanced usage)
export { ImageProcessor } from './libs/image-processor';
export { BackgroundRemovalService } from './libs/background-removal';

// Re-export common types for convenience
export type { ProcessingStatus as ImageStatus } from './types/image';
