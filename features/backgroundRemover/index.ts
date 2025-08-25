// Background Remover Feature - Main Export Index
// This file centralizes all exports for easier imports

// Components
export { default as ImageUpload } from './components/ImageUpload';
export { default as ImageResult } from './components/ImageResult';
export { default as ImageEdit } from './components/ImageEdit';
export { default as SampleImages } from './components/SampleImages';
export { default as BackgroundRemover } from './components/BackgroundRemover';

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

// Services (for advanced usage - server-side only)
// Note: These should only be imported on the server side
// For client components, import directly from the specific files

// Re-export common types for convenience
export type { ProcessingStatus as ImageStatus } from './types/image';
