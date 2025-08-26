import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import type { ProcessedImage, ProcessingConfig, BackgroundRemovalConfig } from '@/features/backgroundRemover/types/image';

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
      return {
        valid: false,
        error: `File type ${file.type} is not supported. Allowed types: ${this.config.allowedFormats.join(', ')}`,
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
    console.log(`🔍 [ImageProcessor] Starting resize check - buffer size: ${buffer.length}`);
    
    // Enable Sharp in production with proper configuration
    console.log(`🔧 [ImageProcessor] Sharp resize enabled with Vercel optimization`);
    
    try {
      console.log(`🔍 [ImageProcessor] Getting metadata...`);
      
      // Add aggressive timeout for metadata
      const metadataPromise = sharp(buffer).metadata();
      const metadataTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sharp metadata timeout')), 5000);
      });
      
      const metadata = await Promise.race([metadataPromise, metadataTimeout]) as any;
      console.log(`🔍 [ImageProcessor] Metadata retrieved:`, { 
        width: metadata.width, 
        height: metadata.height, 
        format: metadata.format 
      });
      
      const { width = 0, height = 0 } = metadata;
      const { maxDimensions } = this.config;

      if (width <= maxDimensions.width && height <= maxDimensions.height) {
        console.log(`✅ [ImageProcessor] No resize needed (${width}x${height} <= ${maxDimensions.width}x${maxDimensions.height})`);
        return buffer;
      }

      console.log(`🔄 [ImageProcessor] Resizing needed from ${width}x${height} to max ${maxDimensions.width}x${maxDimensions.height}`);
      
      // Calculate new dimensions maintaining aspect ratio
      const aspectRatio = width / height;
      let newWidth = maxDimensions.width;
      let newHeight = Math.round(newWidth / aspectRatio);

      if (newHeight > maxDimensions.height) {
        newHeight = maxDimensions.height;
        newWidth = Math.round(newHeight * aspectRatio);
      }

      console.log(`🔄 [ImageProcessor] Calculated new dimensions: ${newWidth}x${newHeight}`);
      console.log(`🔄 [ImageProcessor] Starting Sharp resize operation...`);
      
      // Add aggressive timeout for resize
      const resizePromise = sharp(buffer)
        .resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
        
      const resizeTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sharp resize timeout')), 10000);
      });
      
      const result = await Promise.race([resizePromise, resizeTimeout]) as Buffer;
        
      console.log(`✅ [ImageProcessor] Resize completed - new buffer size: ${result.length}`);
      return result;
    } catch (error) {
      console.error(`❌ [ImageProcessor] Resize failed:`, error);
      throw error;
    }
  }

  /**
   * Flip image horizontally
   */
  async flipHorizontally(buffer: Buffer): Promise<Buffer> {
    // Sharp flip enabled with Vercel optimization
    console.log(`🔧 [ImageProcessor] Sharp flip enabled with Vercel optimization`);
    
    return await sharp(buffer).flop().toBuffer();
  }

  /**
   * Convert image to specified output format
   */
  async convertToOutputFormat(buffer: Buffer): Promise<Buffer> {
    // Sharp format conversion enabled with Vercel optimization
    console.log(`🔧 [ImageProcessor] Sharp format conversion enabled with Vercel optimization`);
    
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
   * Prepare upload data for Supabase storage (NO ACTUAL UPLOAD)
   */
  prepareUploadData(
    filename: string,
    bucket: 'original-images' | 'processed-images'
  ): { filePath: string; contentType: string; fileName: string } {
    const fileExt = this.config.outputFormat;
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${Date.now()}-${fileName}`;

    console.log(`📁 [ImageProcessor] Generated file path for ${filename}: ${filePath}`);

    return {
      filePath,
      contentType: `image/${fileExt}`,
      fileName,
    };
  }

// Storage deletion is now handled in route handlers

// Database updates are now handled in route handlers

  /**
   * Complete image processing pipeline (NO EXTERNAL CALLS)
   * Returns processed buffer and metadata for the route handler to handle
   */
  async processImage(
    originalBuffer: Buffer,
    imageId: string,
    removeBackgroundFn: (buffer: Buffer) => Promise<Buffer>
  ): Promise<{ 
    processedBuffer: Buffer; 
    processingTimeMs: number;
    uploadData: { filePath: string; contentType: string; fileName: string };
  }> {
    const startTime = Date.now();
    console.log(`🔄 [ImageProcessor] Starting processing pipeline for ${imageId}`);

    try {
      // Step 1: Resize if needed
      console.log(`📏 [ImageProcessor] Step 1: Resizing if needed for ${imageId}`);
      const resizedBuffer = await this.resizeIfNeeded(originalBuffer);
      console.log(`📏 [ImageProcessor] Resize completed for ${imageId}`);

      // Step 2: Remove background
      console.log(`🎭 [ImageProcessor] Step 2: Removing background for ${imageId}`);
      const noBgBuffer = await removeBackgroundFn(resizedBuffer);
      console.log(`🎭 [ImageProcessor] Background removal completed for ${imageId}`);

      // Step 3: Flip horizontally
      console.log(`🔄 [ImageProcessor] Step 3: Flipping horizontally for ${imageId}`);
      const flippedBuffer = await this.flipHorizontally(noBgBuffer);
      console.log(`🔄 [ImageProcessor] Flip completed for ${imageId}`);

      // Step 4: Convert to output format
      console.log(`🔧 [ImageProcessor] Step 4: Converting to output format for ${imageId}`);
      const finalBuffer = await this.convertToOutputFormat(flippedBuffer);
      console.log(`🔧 [ImageProcessor] Format conversion completed for ${imageId}`);

      // Step 5: Prepare upload data (but don't upload)
      console.log(`📁 [ImageProcessor] Step 5: Preparing upload data for ${imageId}`);
      const uploadData = this.prepareUploadData(`processed-${imageId}`, 'processed-images');

      const processingTimeMs = Date.now() - startTime;
      console.log(`🎉 [ImageProcessor] Processing pipeline completed for ${imageId} in ${processingTimeMs}ms`);

      return { 
        processedBuffer: finalBuffer, 
        processingTimeMs,
        uploadData 
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      console.error(`❌ [ImageProcessor] Pipeline failed for ${imageId} after ${processingTimeMs}ms:`, error);
      throw error;
    }
  }
}
