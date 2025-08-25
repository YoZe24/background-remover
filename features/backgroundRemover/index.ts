// Background Remover Feature - Main Export Index
// This file centralizes all exports for easier imports

// Components
export { default as ImageUpload } from './components/ImageUpload';
export { default as ImageResult } from './components/ImageResult';
export { default as SampleImages } from './components/SampleImages';

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

// Hooks
export { useImageUpload } from './hooks/useImageUpload';

// Utilities
export {
  generateSampleImageUrl,
  getAllSampleImageCombinations,
  getSampleImagesByCategory,
  getRandomSampleImage,
  getSampleImagesByNumber,
  getSampleImageByCategory,
  AVAILABLE_CATEGORIES,
  AVAILABLE_NUMBERS
} from './utils/sample-image-generator';
export type { SampleImageOption, Category, ImageNumber } from './utils/sample-image-generator';

// Services (for advanced usage)
export { ImageProcessor } from './libs/image-processor';
export { BackgroundRemovalService } from './libs/background-removal';

// Re-export common types for convenience
export type { ProcessingStatus as ImageStatus } from './types/image';
