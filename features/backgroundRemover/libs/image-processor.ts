import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/libs/supabase/server';
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
   * Upload file to Supabase storage
   */
  async uploadToStorage(
    buffer: Buffer,
    filename: string,
    bucket: 'original-images' | 'processed-images'
  ): Promise<{ url: string; path: string }> {
    const supabase = await createClient();
    const fileExt = this.config.outputFormat;
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${Date.now()}-${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path,
    };
  }

  /**
   * Delete file from storage
   */
  async deleteFromStorage(path: string, bucket: 'original-images' | 'processed-images'): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error(`Failed to delete file from storage: ${error.message}`);
      // Don't throw error for cleanup operations
    }
  }

  /**
   * Update processing status in database
   */
  async updateProcessingStatus(
    id: string,
    status: ProcessedImage['status'],
    updates: Partial<ProcessedImage> = {}
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`📝 [ImageProcessor] Starting DB update for ${id} to status: ${status}`);
    
    try {
      const supabase = await createClient();
      console.log(`🔌 [ImageProcessor] Supabase client created for ${id}`);
      
      // Add timeout to the database operation
      const updatePromise = supabase
        .from('processed_images')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...updates,
        })
        .eq('id', id);
  
      // Race the update against a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Database update timed out after 10 seconds for ${id}`));
        }, 10000); // 10 second timeout
      });
  
      console.log(`⏳ [ImageProcessor] Starting DB update query for ${id}...`);
      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;
      
      const updateTime = Date.now() - startTime;
      console.log(`✅ [ImageProcessor] DB update completed for ${id} in ${updateTime}ms`);
  
      if (error) {
        console.error(`❌ [ImageProcessor] DB update error for ${id}:`, error);
        throw new Error(`Failed to update processing status: ${error.message}`);
      }
    } catch (error) {
      const updateTime = Date.now() - startTime;
      console.error(`💥 [ImageProcessor] DB update failed for ${id} after ${updateTime}ms:`, error);
      throw error;
    }
  }
  
  /**
   * Complete image processing pipeline
   */
  async processImage(
    originalBuffer: Buffer,
    imageId: string,
    removeBackgroundFn: (buffer: Buffer) => Promise<Buffer>
  ): Promise<{ processedUrl: string; processingTimeMs: number }> {
    const startTime = Date.now();
    console.log(`🔄 [ImageProcessor] Starting processing pipeline for ${imageId}`);

    try {
      // Update status to processing
      console.log(`📝 [ImageProcessor] Updating status to 'processing' for ${imageId}`);
      await this.updateProcessingStatus(imageId, 'processing');

      // Step 1: Resize if needed
      console.log(`📏 [ImageProcessor] Step 1: Resizing if needed for ${imageId}`);
      const resizeStart = Date.now();
      const resizedBuffer = await this.resizeIfNeeded(originalBuffer);
      console.log(`📏 [ImageProcessor] Resize completed for ${imageId} in ${Date.now() - resizeStart}ms (${originalBuffer.length} -> ${resizedBuffer.length} bytes)`);

      // Step 2: Remove background
      console.log(`🎭 [ImageProcessor] Step 2: Removing background for ${imageId}`);
      const bgRemovalStart = Date.now();
      const noBgBuffer = await removeBackgroundFn(resizedBuffer);
      console.log(`🎭 [ImageProcessor] Background removal completed for ${imageId} in ${Date.now() - bgRemovalStart}ms (${resizedBuffer.length} -> ${noBgBuffer.length} bytes)`);

      // Step 3: Flip horizontally
      console.log(`🔄 [ImageProcessor] Step 3: Flipping horizontally for ${imageId}`);
      const flipStart = Date.now();
      const flippedBuffer = await this.flipHorizontally(noBgBuffer);
      console.log(`🔄 [ImageProcessor] Flip completed for ${imageId} in ${Date.now() - flipStart}ms`);

      // Step 4: Convert to output format
      console.log(`🔧 [ImageProcessor] Step 4: Converting to output format for ${imageId}`);
      const convertStart = Date.now();
      const finalBuffer = await this.convertToOutputFormat(flippedBuffer);
      console.log(`🔧 [ImageProcessor] Format conversion completed for ${imageId} in ${Date.now() - convertStart}ms`);

      // Step 5: Upload processed image
      console.log(`☁️ [ImageProcessor] Step 5: Uploading processed image for ${imageId}`);
      const uploadStart = Date.now();
      const { url: processedUrl } = await this.uploadToStorage(
        finalBuffer,
        `processed-${imageId}`,
        'processed-images'
      );
      console.log(`☁️ [ImageProcessor] Upload completed for ${imageId} in ${Date.now() - uploadStart}ms`);

      const processingTimeMs = Date.now() - startTime;

      // Step 6: Update status to completed
      console.log(`✅ [ImageProcessor] Step 6: Updating status to 'completed' for ${imageId}`);
      await this.updateProcessingStatus(imageId, 'completed', {
        processed_url: processedUrl,
        processing_time_ms: processingTimeMs,
      });

      console.log(`🎉 [ImageProcessor] Complete pipeline finished for ${imageId} in ${processingTimeMs}ms`);
      return { processedUrl, processingTimeMs };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      console.error(`❌ [ImageProcessor] Pipeline failed for ${imageId} after ${processingTimeMs}ms:`, error);
      
      // Update status to failed
      console.log(`💥 [ImageProcessor] Updating status to 'failed' for ${imageId}`);
      await this.updateProcessingStatus(imageId, 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: processingTimeMs,
      });

      throw error;
    }
  }
}
