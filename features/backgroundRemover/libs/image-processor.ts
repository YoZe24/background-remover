import sharp from 'sharp';
import type { ProcessingConfig } from '@/features/backgroundRemover/types/image';

// Default processing configuration
const DEFAULT_CONFIG: ProcessingConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  outputFormat: 'png',
  outputQuality: 90,
  maxDimensions: {
    width: 4096,
    height: 4096,
  },
};

export class ImageProcessor {
  private config: ProcessingConfig;

  constructor(config: Partial<ProcessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.config.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    // Check file type
    if (!this.config.allowedFormats.includes(file.type)) {
      const supportedTypes = this.config.allowedFormats.map(type => {
        switch (type) {
          case 'image/jpeg': return 'JPEG';
          case 'image/png': return 'PNG';
          case 'image/webp': return 'WebP';
          case 'image/gif': return 'GIF';
          default: return type;
        }
      }).join(', ');
      
      return {
        valid: false,
        error: `File type "${file.type}" is not supported. Supported formats: ${supportedTypes}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get image dimensions and metadata
   */
  async getImageMetadata(buffer: Buffer): Promise<{ width: number; height: number; format: string; size: number }> {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: buffer.length,
    };
  }

  /**
   * Resize image if it exceeds max dimensions
   */
  async resizeIfNeeded(buffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(buffer).metadata();
    const { width = 0, height = 0 } = metadata;
    const { maxDimensions } = this.config;

    if (width <= maxDimensions.width && height <= maxDimensions.height) {
      return buffer;
    }

    // Calculate new dimensions maintaining aspect ratio
    const aspectRatio = width / height;
    let newWidth = maxDimensions.width;
    let newHeight = Math.round(newWidth / aspectRatio);

    if (newHeight > maxDimensions.height) {
      newHeight = maxDimensions.height;
      newWidth = Math.round(newHeight * aspectRatio);
    }

    return await sharp(buffer)
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
  }

  /**
   * Flip image horizontally
   */
  async flipHorizontally(buffer: Buffer): Promise<Buffer> {
    return await sharp(buffer).flop().toBuffer();
  }

  /**
   * Convert image to specified output format
   */
  async convertToOutputFormat(buffer: Buffer): Promise<Buffer> {
    const sharpInstance = sharp(buffer);

    switch (this.config.outputFormat) {
      case 'png':
        return await sharpInstance.png({ quality: this.config.outputQuality }).toBuffer();
      case 'webp':
        return await sharpInstance.webp({ quality: this.config.outputQuality }).toBuffer();
      default:
        return buffer;
    }
  }

  /**
   * Process image buffer through the complete pipeline
   * Returns the final processed buffer - no database/storage operations
   */
  async processImageBuffer(
    originalBuffer: Buffer,
    removeBackgroundFn: (buffer: Buffer) => Promise<Buffer>
  ): Promise<{ processedBuffer: Buffer; processingTimeMs: number; steps: any[] }> {
    const startTime = Date.now();
    const steps: any[] = [];
    console.log(`🔄 [ImageProcessor] Starting processing pipeline (buffer size: ${originalBuffer.length} bytes)`);

    try {
      // Step 1: Resize if needed
      console.log(`📏 [ImageProcessor] Step 1: Resizing if needed`);
      const resizeStart = Date.now();
      const resizedBuffer = await this.resizeIfNeeded(originalBuffer);
      const resizeTime = Date.now() - resizeStart;
      steps.push({ step: 'resize', timeMs: resizeTime, inputSize: originalBuffer.length, outputSize: resizedBuffer.length });
      console.log(`📏 [ImageProcessor] Resize completed in ${resizeTime}ms (${originalBuffer.length} -> ${resizedBuffer.length} bytes)`);

      // Step 2: Remove background
      console.log(`🎭 [ImageProcessor] Step 2: Removing background`);
      const bgRemovalStart = Date.now();
      const noBgBuffer = await removeBackgroundFn(resizedBuffer);
      const bgRemovalTime = Date.now() - bgRemovalStart;
      steps.push({ step: 'backgroundRemoval', timeMs: bgRemovalTime, inputSize: resizedBuffer.length, outputSize: noBgBuffer.length });
      console.log(`🎭 [ImageProcessor] Background removal completed in ${bgRemovalTime}ms (${resizedBuffer.length} -> ${noBgBuffer.length} bytes)`);

      // Step 3: Flip horizontally
      console.log(`🔄 [ImageProcessor] Step 3: Flipping horizontally`);
      const flipStart = Date.now();
      const flippedBuffer = await this.flipHorizontally(noBgBuffer);
      const flipTime = Date.now() - flipStart;
      steps.push({ step: 'flip', timeMs: flipTime });
      console.log(`🔄 [ImageProcessor] Flip completed in ${flipTime}ms`);

      // Step 4: Convert to output format
      console.log(`🔧 [ImageProcessor] Step 4: Converting to output format`);
      const convertStart = Date.now();
      const finalBuffer = await this.convertToOutputFormat(flippedBuffer);
      const convertTime = Date.now() - convertStart;
      steps.push({ step: 'convert', timeMs: convertTime, outputSize: finalBuffer.length });
      console.log(`🔧 [ImageProcessor] Format conversion completed in ${convertTime}ms`);

      const processingTimeMs = Date.now() - startTime;
      console.log(`🎉 [ImageProcessor] Complete pipeline finished in ${processingTimeMs}ms`);
      
      return { 
        processedBuffer: finalBuffer, 
        processingTimeMs,
        steps
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      console.error(`❌ [ImageProcessor] Pipeline failed after ${processingTimeMs}ms:`, error);
      throw error;
    }
  }
}
