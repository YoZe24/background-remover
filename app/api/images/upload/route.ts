import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServiceClient } from '@/libs/supabase/server';
import { ImageProcessor } from '@/features/backgroundRemover/libs/image-processor';
import { BackgroundRemovalService } from '@/features/backgroundRemover/libs/background-removal';
import type { ProcessedImage } from '@/features/backgroundRemover/types/image';

// Configure maximum file size for uploads (50MB)
export const maxDuration = 60; // 60 seconds max execution time for Vercel Pro
export const runtime = 'nodejs'; // Ensure we're using Node.js runtime

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string || uuidv4();

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Initialize services
    const imageProcessor = new ImageProcessor();
    const backgroundRemoval = new BackgroundRemovalService();

    // Validate file
    const validation = imageProcessor.validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Validate background removal service
    const serviceValidation = backgroundRemoval.validateConfig();
    if (!serviceValidation.valid) {
      return NextResponse.json(
        { error: `Service configuration error: ${serviceValidation.errors.join(', ')}` },
        { status: 500 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Get image metadata using ImageProcessor
    const metadata = await imageProcessor.getImageMetadata(buffer);

    // Upload original image to storage (inline)
    const supabase = createServiceClient();
    const originalFileExt = file.type.split('/')[1] || 'png';
    const originalFileName = `${uuidv4()}.${originalFileExt}`;
    const originalFilePath = `${Date.now()}-${originalFileName}`;

    const { data: originalData, error: originalError } = await supabase.storage
      .from('original-images')
      .upload(originalFilePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (originalError) {
      return NextResponse.json(
        { error: `Failed to upload original image: ${originalError.message}` },
        { status: 500 }
      );
    }

    // Get public URL for original
    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('original-images')
      .getPublicUrl(originalData.path);

    const originalPath = originalData.path;

    // Create database record
    const imageRecord: Omit<ProcessedImage, 'id' | 'created_at' | 'updated_at'> = {
      original_filename: file.name,
      original_url: originalUrl,
      processed_url: null,
      status: 'pending',
      error_message: null,
      file_size: file.size,
      dimensions: {
        width: metadata.width,
        height: metadata.height,
      },
      processing_time_ms: null,
      user_session_id: sessionId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data, error } = await supabase
      .from('processed_images')
      .insert(imageRecord)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      // Cleanup uploaded file (inline)
      try {
        await supabase.storage.from('original-images').remove([originalPath]);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      return NextResponse.json(
        { error: 'Failed to create image record' },
        { status: 500 }
      );
    }

    // Start background processing
    console.log(`🚀 [Upload] Starting background processing for ${data.id}`);
    
    // Start processing in background (but keep execution context alive)
    processImageInBackground(data.id, buffer, imageProcessor, backgroundRemoval, supabase)
      .catch(error => {
        console.error(`❌ [Upload] Background processing failed for ${data.id}:`, error);
      });

    // Return immediate response
    return NextResponse.json({
      id: data.id,
      status: 'pending',
      message: 'Image uploaded successfully. Processing started.',
      originalUrl,
      sessionId,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to upload image'
      },
      { status: 500 }
    );
  }
}

/**
 * Process image in background with ALL Supabase calls in route handler
 */
async function processImageInBackground(
  imageId: string,
  originalBuffer: Buffer,
  imageProcessor: ImageProcessor,
  backgroundRemoval: BackgroundRemovalService,
  supabase: any
) {
  const startTime = Date.now();
  console.log(`🎨 [Background] Starting background processing for image ${imageId} (buffer size: ${originalBuffer.length} bytes)`);
  
  try {
    // Step 1: Update status to processing (Supabase call in route)
    console.log(`📝 [Background] Updating status to 'processing' for ${imageId}`);
    const { error: statusError } = await supabase
      .from('processed_images')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);
    
    if (statusError) {
      throw new Error(`Failed to update status: ${statusError.message}`);
    }
    
    console.log(`✅ [Background] Status updated to processing for ${imageId}`);
    
    // Step 2: Process image (ImageProcessor returns data, no external calls)
    console.log(`🔄 [Background] Starting image processing for ${imageId}`);
    const processingResult = await imageProcessor.processImage(
      originalBuffer,
      imageId,
      (buffer) => backgroundRemoval.removeBackground(buffer)
    );
    
    console.log(`✅ [Background] Image processing completed for ${imageId}`);
    
    // Step 3: Upload processed image (Supabase call in route)
    console.log(`☁️ [Background] Uploading processed image for ${imageId}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('processed-images')
      .upload(processingResult.uploadData.filePath, processingResult.processedBuffer, {
        contentType: processingResult.uploadData.contentType,
        upsert: false,
      });
    
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // Get public URL (Supabase call in route)
    const { data: { publicUrl } } = supabase.storage
      .from('processed-images')
      .getPublicUrl(uploadData.path);
    
    console.log(`✅ [Background] Upload completed for ${imageId}: ${publicUrl}`);
    
    // Step 4: Update to completed (Supabase call in route)
    console.log(`📝 [Background] Updating status to 'completed' for ${imageId}`);
    const { error: completedError } = await supabase
      .from('processed_images')
      .update({
        status: 'completed',
        processed_url: publicUrl,
        processing_time_ms: processingResult.processingTimeMs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);
    
    if (completedError) {
      console.error(`❌ [Background] Failed to update to completed: ${completedError.message}`);
      // Continue anyway, processing succeeded
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`🎉 [Background] Successfully processed image ${imageId} in ${totalTime}ms`);
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [Background] Failed to process image ${imageId} after ${totalTime}ms:`, error);
    
    // Update to failed status (Supabase call in route)
    try {
      await supabase
        .from('processed_images')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Processing failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', imageId);
    } catch (updateError) {
      console.error(`❌ [Background] Failed to update failed status: ${updateError}`);
    }
    
    throw error;
  }
}
