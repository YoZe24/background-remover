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

    // Get image metadata
    const metadata = await imageProcessor.getImageMetadata(buffer);

    // Upload original image to storage
    const { url: originalUrl, path: originalPath } = await imageProcessor.uploadToStorage(
      buffer,
      file.name,
      'original-images'
    );

    // Create database record
    const supabase = createServiceClient(); // Use service client for database INSERT
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
      // Cleanup uploaded file
      await imageProcessor.deleteFromStorage(originalPath, 'original-images');
      
      return NextResponse.json(
        { error: 'Failed to create image record' },
        { status: 500 }
      );
    }

    // Start processing and wait for the initial status update to ensure execution context persists
    console.log(`🚀 [Upload] Starting processing for ${data.id} (waiting for initial status update)`);
    
    try {
      // Update status to processing first to ensure the function stays alive
      await imageProcessor.updateProcessingStatus(data.id, 'processing');
      console.log(`✅ [Upload] Initial status update completed for ${data.id}`);
      
      // Now start the actual processing in background (but keep the context alive longer)
      processImageInBackground(data.id, buffer, imageProcessor, backgroundRemoval)
        .catch(error => {
          console.error(`❌ [Upload] Background processing failed for ${data.id}:`, error);
        });

      // Return response after ensuring processing context is established
      return NextResponse.json({
        id: data.id,
        status: 'processing', // Changed from 'pending' since we already updated it
        message: 'Image uploaded successfully. Processing started.',
        originalUrl,
        sessionId,
      });
    } catch (error) {
      console.error(`❌ [Upload] Failed to start processing for ${data.id}:`, error);
      
      // Fallback: still return success but mark as failed
      await imageProcessor.updateProcessingStatus(data.id, 'failed', {
        error_message: 'Failed to start processing'
      });
      
      return NextResponse.json({
        id: data.id,
        status: 'failed',
        message: 'Image uploaded but processing failed to start.',
        originalUrl,
        sessionId,
      });
    }

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
 * Process image in background (async)
 */
async function processImageInBackground(
  imageId: string,
  originalBuffer: Buffer,
  imageProcessor: ImageProcessor,
  backgroundRemoval: BackgroundRemovalService
) {
  const startTime = Date.now();
  console.log(`🎨 [Background] Starting background processing for image ${imageId} (buffer size: ${originalBuffer.length} bytes)`);
  console.log(`🔍 [Background] Execution context check for ${imageId} - function starting`);
  
  // Add a small delay to ensure we're truly in background context
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`🔍 [Background] Execution context check for ${imageId} - delay completed`);
  
  try {
    // Log service configuration
    const serviceInfo = backgroundRemoval.getServiceInfo();
    console.log(`🔧 [Upload] Service config for ${imageId}:`, serviceInfo);
    
    await imageProcessor.processImage(
      originalBuffer,
      imageId,
      (buffer) => {
        console.log(`🔄 [Upload] Calling background removal for ${imageId}...`);
        return backgroundRemoval.removeBackground(buffer);
      }
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ [Background] Successfully processed image ${imageId} in ${totalTime}ms`);
    console.log(`🔍 [Background] Execution context check for ${imageId} - completed successfully`);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [Background] Failed to process image ${imageId} after ${totalTime}ms:`, error);
    console.log(`🔍 [Background] Execution context check for ${imageId} - failed with error`);
    
    // Additional error context
    if (error instanceof Error) {
      console.error(`❌ [Upload] Error details for ${imageId}:`, {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    
    // Error handling is done within processImage method
  }
}
